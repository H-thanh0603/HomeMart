/**
 * Integration test — ShippingService.handleWebhook (P1 fix):
 * Carrier webhook KHÔNG được phép:
 *  1. "Hồi sinh" đơn CANCELLED (admin hủy xong, webhook DELIVERED tới trễ)
 *  2. Ghi đè state machine (transition không hợp lệ)
 *  3. Double-emit event khi carrier retry cùng 1 event
 *
 * Chạy bằng postgres thật (như business-rules.spec).
 */
process.env.DATABASE_URL ||= 'postgresql://homemart:homemart_secret@localhost:54329/homemart?schema=public';
process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET ||= 'x'.repeat(32);
process.env.JWT_REFRESH_SECRET ||= 'y'.repeat(32);
process.env.GHN_WEBHOOK_TOKEN = 'test-ghn-token';

import { PrismaClient, OrderStatus, ProductStatus, ShipmentStatus } from 'src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ShippingService } from './shipping.service';
import { RedisService } from '../../infra/redis.service';
import { PrismaService } from '../../infra/prisma.service';

// PrismaService::constructor chỉ đọc DATABASE_URL — dùng chung instance
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

jest.setTimeout(30000);

describe('ShippingService.handleWebhook — state machine + idempotency (P1)', () => {
  let shippingService: ShippingService;
  let emittedEvents: Array<{ orderId: string; from: string; to: string }>;
  let productId: string;
  let userId: string;
  let userEmail: string;
  let methodId: string;

  const GHN_HEADERS = { 'x-token': 'test-ghn-token' };

  /** Tạo đơn + shipment với trackingCode cho trước. */
  async function seedOrderWithShipment(trackingCode: string, orderStatus: OrderStatus) {
    const orderNumber = `TEST-GHN-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    await prisma.order.create({
      data: {
        orderNumber,
        userId,
        status: orderStatus,
        contactName: 'Test',
        contactPhone: '0900000000',
        shippingProvince: 'HN',
        shippingDistrict: 'D1',
        shippingWard: 'W1',
        shippingLine: 'line',
        subtotalAmount: 100000,
        totalAmount: 100000,
        items: {
          create: [{ productId, productName: 'p', sku: 's', unitPrice: 100000, quantity: 1, lineTotal: 100000 }],
        },
        payments: { create: { method: 'COD', amount: 100000, status: 'PENDING' } },
      },
    });
    const order = await prisma.order.findUniqueOrThrow({ where: { orderNumber } });
    await prisma.shipment.create({
      data: { orderId: order.id, methodId, carrierName: 'GHN', trackingCode, status: ShipmentStatus.PREPARING },
    });
    return order;
  }

  beforeAll(async () => {
    const events = new EventEmitter2();
    emittedEvents = [];
    events.on('order.status_changed', (e: { orderId: string; from: string; to: string }) => emittedEvents.push(e));

    // RedisService tự kết nối lazy — trong test không dùng redis path của
    // computeFee nên không cần redis chạy.
    const redisStub = { get: jest.fn(), set: jest.fn(), del: jest.fn(), tryLock: jest.fn(async () => true) } as never;
    shippingService = new (ShippingService as unknown as new (
      prisma: PrismaService, events: EventEmitter2, redis: RedisService,
    ) => ShippingService)(prisma as never, events, redisStub);

    const cat = await prisma.category.upsert({
      where: { slug: 'test-ghn' },
      update: {},
      create: { slug: 'test-ghn', name: 'Test GHN' },
    });
    const product = await prisma.product.create({
      data: {
        sku: `TEST-GHN-${Date.now()}`,
        slug: `test-ghn-${Date.now()}`,
        name: 'Test GHN Product',
        categoryId: cat.id,
        price: 100000,
        status: ProductStatus.PUBLISHED,
        inventories: { create: { availableStock: 10 } },
      },
    });
    productId = product.id;

    const user = await prisma.user.create({
      data: { email: userEmail = `ghn-${Date.now()}@test.local`, passwordHash: 'x', fullName: 'GHN Test', role: 'CUSTOMER' },
    });
    userId = user.id;

    const method = await prisma.shippingMethod.findFirst({ where: { isActive: true } });
    if (method) methodId = method.id;
    else {
      const created = await prisma.shippingMethod.create({
        data: { code: 'STANDARD', name: 'Test Standard', baseFee: 30000, feePerKg: 5000, estimatedDaysMin: 2, estimatedDaysMax: 5, isActive: true },
      });
      methodId = created.id;
    }
  });

  afterAll(async () => {
    // Dọn fixture theo thứ tự FK
    const orders = await prisma.order.findMany({
      where: { orderNumber: { startsWith: 'TEST-GHN-' } },
      select: { id: true },
    });
    const orderIds = orders.map((o) => o.id);
    if (orderIds.length) {
      await prisma.shipment.deleteMany({ where: { orderId: { in: orderIds } } });
      await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
      await prisma.orderStatusHistory.deleteMany({ where: { orderId: { in: orderIds } } });
      await prisma.paymentTransaction.deleteMany({ where: { payment: { orderId: { in: orderIds } } } });
      await prisma.payment.deleteMany({ where: { orderId: { in: orderIds } } });
      await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
    }
    await prisma.user.deleteMany({ where: { email: userEmail } });
    const leftovers = await prisma.product.findMany({
      where: { sku: { startsWith: 'TEST-GHN-' } },
      select: { id: true },
    });
    const ids = leftovers.map((p) => p.id);
    if (ids.length) {
      await prisma.inventoryTransaction.deleteMany({ where: { inventory: { productId: { in: ids } } } });
      await prisma.inventory.deleteMany({ where: { productId: { in: ids } } });
      await prisma.product.deleteMany({ where: { id: { in: ids } } });
    }
    await prisma.$disconnect();
  });

  it('REJECTS invalid webhook signature', async () => {
    const result = await shippingService.handleWebhook('GHN', { order_code: 'X', status: 'delivered' }, { 'x-token': 'WRONG' });
    expect(result.ok).toBe(false);
    expect(result.message).toContain('signature');
  });

  it('webhook DELIVERED không hồi sinh đơn CANCELLED', async () => {
    const trackingCode = `GHN-TEST-CANCEL-${Date.now()}`;
    await seedOrderWithShipment(trackingCode, OrderStatus.CANCELLED);

    const result = await shippingService.handleWebhook(
      'GHN',
      { order_code: trackingCode, status: 'delivered' },
      GHN_HEADERS,
    );
    // Shipment được cập nhật tracking (đúng), nhưng order KHÔNG bị đổi
    expect(result.ok).toBe(true);
    const shipment = await prisma.shipment.findFirstOrThrow({ where: { trackingCode }, include: { order: true } });
    expect(shipment.order.status).toBe(OrderStatus.CANCELLED); // vẫn CANCELLED
  });

  it('webhook DELIVERED chuyển đơn đang giao → DELIVERED (transition hợp lệ)', async () => {
    const trackingCode = `GHN-TEST-OK-${Date.now()}`;
    const order = await seedOrderWithShipment(trackingCode, OrderStatus.SHIPPED);

    const result = await shippingService.handleWebhook(
      'GHN',
      { order_code: trackingCode, status: 'delivered' },
      GHN_HEADERS,
    );
    expect(result.ok).toBe(true);

    const after = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(after.status).toBe(OrderStatus.DELIVERED);
    expect(after.version).toBe(order.version + 1);

    const history = await prisma.orderStatusHistory.findFirst({
      where: { orderId: order.id, toStatus: 'DELIVERED', note: { contains: 'webhook' } },
    });
    expect(history).toBeTruthy(); // có statusHistory cho audit

    const eventsForOrder = emittedEvents.filter((e) => e.orderId === order.id && e.to === 'DELIVERED');
    expect(eventsForOrder).toHaveLength(1); // đúng 1 event
  });

  it('carrier retry cùng event DELIVERED → không emit event lần 2 (idempotent)', async () => {
    const trackingCode = `GHN-TEST-RETRY-${Date.now()}`;
    const order = await seedOrderWithShipment(trackingCode, OrderStatus.SHIPPED);

    const first = await shippingService.handleWebhook(
      'GHN',
      { order_code: trackingCode, status: 'delivered' },
      GHN_HEADERS,
    );
    const second = await shippingService.handleWebhook(
      'GHN',
      { order_code: trackingCode, status: 'delivered' }, // retry
      GHN_HEADERS,
    );

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true); // vẫn 200 OK để carrier ngừng retry

    const after = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(after.status).toBe(OrderStatus.DELIVERED); // không đổi gì thêm

    const eventsForOrder = emittedEvents.filter((e) => e.orderId === order.id && e.to === 'DELIVERED');
    expect(eventsForOrder).toHaveLength(1); // KHÔNG emit lần 2

    const history = await prisma.orderStatusHistory.findMany({
      where: { orderId: order.id, toStatus: 'DELIVERED' },
    });
    expect(history).toHaveLength(1); // không double history
  });

  it('webhook PICKED_UP chỉ áp dụng khi đơn đang CONFIRMED (state machine)', async () => {
    const trackingCode = `GHN-TEST-PICK-${Date.now()}`;
    // Đơn PACKING (đã qua CONFIRMED → PROCESSING → PACKING): PICKED_UP không hợp lệ
    await seedOrderWithShipment(trackingCode, OrderStatus.PACKING);

    await shippingService.handleWebhook(
      'GHN',
      { order_code: trackingCode, status: 'picking' },
      GHN_HEADERS,
    );

    const shipment = await prisma.shipment.findFirstOrThrow({ where: { trackingCode }, include: { order: true } });
    expect(shipment.order.status).toBe(OrderStatus.PACKING); // KHÔNG bị ép về PROCESSING
  });
});
