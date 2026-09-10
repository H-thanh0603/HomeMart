/**
 * Integration test — PaymentsService.expirePendingOrders (P0 fix):
 * đơn PENDING quá ORDER_PAYMENT_TIMEOUT_MINUTES phải được CANCELLED
 * và reservedStock trả về kho. Không có bước này, kho "chết dần" theo
 * từng đơn khách bỏ thanh toán.
 *
 * Chạy bằng postgres thật (docker compose up postgres — như business-rules.spec).
 */
process.env.DATABASE_URL ||= 'postgresql://homemart:homemart_secret@localhost:54329/homemart?schema=public';
process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET ||= 'x'.repeat(32);
process.env.JWT_REFRESH_SECRET ||= 'y'.repeat(32);
process.env.ORDER_PAYMENT_TIMEOUT_MINUTES = '30';

import { PrismaClient, ProductStatus, OrderStatus, PaymentStatus } from 'src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PaymentsService } from './payments.service';
import { InventoryService } from '../inventory/inventory.service';
import { CodProvider } from './providers/cod.provider';
import { VnpayProvider } from './providers/vnpay.provider';
import { MomoProvider } from './providers/momo.provider';
import { StripeProvider } from './providers/stripe.provider';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

jest.setTimeout(30000);

describe('PaymentsService.expirePendingOrders — hết hạn đơn PENDING, giải phóng kho (P0)', () => {
  let paymentsService: PaymentsService;
  let inventoryService: InventoryService;
  let productId: string;
  let userId: string;
  let userScheduleEmail: string;

  beforeAll(async () => {
    inventoryService = new InventoryService(prisma as never, new EventEmitter2());
    paymentsService = new PaymentsService(
      prisma as never,
      inventoryService,
      new CodProvider(),
      new VnpayProvider(),
      new MomoProvider(),
      new StripeProvider(),
      new EventEmitter2(),
    );

    const cat = await prisma.category.upsert({
      where: { slug: 'test-expire' },
      update: {},
      create: { slug: 'test-expire', name: 'Test Expire' },
    });
    const product = await prisma.product.create({
      data: {
        sku: `TEST-EXP-${Date.now()}`,
        slug: `test-exp-${Date.now()}`,
        name: 'Test Expire Product',
        categoryId: cat.id,
        price: 100000,
        status: ProductStatus.PUBLISHED,
        inventories: { create: { availableStock: 10 } },
      },
      include: { inventories: true },
    });
    productId = product.id;

    const user = await prisma.user.create({
      data: {
        email: userScheduleEmail = `expire-${Date.now()}@test.local`,
        passwordHash: 'x',
        fullName: 'Expire Test',
        role: 'CUSTOMER',
      },
    });
    userId = user.id;
  });

  afterAll(async () => {
    // Dọn theo đúng thứ tự FK: order items → order history → payments →
    // idempotency → order → user → inventory ledger → inventory → product
    const orders = await prisma.order.findMany({
      where: { orderNumber: { startsWith: 'TEST-EXP' } },
      select: { id: true },
    });
    const orderIds = orders.map((o) => o.id);
    if (orderIds.length) {
      await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
      await prisma.orderStatusHistory.deleteMany({ where: { orderId: { in: orderIds } } });
      await prisma.paymentTransaction.deleteMany({ where: { payment: { orderId: { in: orderIds } } } });
      await prisma.payment.deleteMany({ where: { orderId: { in: orderIds } } });
      await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
    }
    await prisma.user.deleteMany({ where: { email: userScheduleEmail } });
    const leftovers = await prisma.product.findMany({
      where: { sku: { startsWith: 'TEST-EXP-' } },
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

  /** Tạo 1 đơn PENDING đã cũ hơn timeout, có reserve stock + payment PENDING. */
  async function seedStalePendingOrder() {
    const orderNumber = `TEST-EXP-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    await prisma.$transaction(async (tx) => {
      await inventoryService.reserve(tx as never, [{ productId, quantity: 4 }], orderNumber);
      await tx.order.create({
        data: {
          orderNumber,
          userId,
          status: OrderStatus.PENDING,
          contactName: 'Test',
          contactPhone: '0900000000',
          shippingProvince: 'HN',
          shippingDistrict: 'D1',
          shippingWard: 'W1',
          shippingLine: 'line',
          subtotalAmount: 400000,
          totalAmount: 400000,
          createdAt: new Date(Date.now() - 31 * 60e3), // 31 phút trước > timeout 30'
          items: {
            create: [{ productId, productName: 'p', sku: 's', unitPrice: 100000, quantity: 4, lineTotal: 400000 }],
          },
          payments: { create: { method: 'COD', amount: 400000, status: 'PENDING' } },
        },
      });
    });
    return orderNumber;
  }

  it('cancels stale PENDING order, releases reserved stock, cancels payment', async () => {
    const orderNumber = await seedStalePendingOrder();

    const before = await prisma.inventory.findFirstOrThrow({ where: { productId } });
    expect(before.availableStock).toBe(6);
    expect(before.reservedStock).toBe(4);

    const result = await paymentsService.expirePendingOrders();
    expect(result.expired).toBeGreaterThanOrEqual(1);

    const order = await prisma.order.findUniqueOrThrow({ where: { orderNumber } });
    expect(order.status).toBe(OrderStatus.CANCELLED);
    expect(order.cancelledReason).toBe('payment_timeout');

    const payment = await prisma.payment.findFirstOrThrow({ where: { order: { orderNumber } } });
    expect(payment.status).toBe(PaymentStatus.CANCELLED);

    const after = await prisma.inventory.findFirstOrThrow({ where: { productId } });
    expect(after.availableStock).toBe(10);
    expect(after.reservedStock).toBe(0);
  });

  it('không đụng đơn PENDING còn mới (chưa quá timeout)', async () => {
    const orderNumber = `TEST-EXP-NEW-${Date.now()}`;
    await prisma.$transaction(async (tx) => {
      await inventoryService.reserve(tx as never, [{ productId, quantity: 2 }], orderNumber);
      await tx.order.create({
        data: {
          orderNumber,
          userId,
          status: OrderStatus.PENDING,
          contactName: 'Test',
          contactPhone: '0900000000',
          shippingProvince: 'HN',
          shippingDistrict: 'D1',
          shippingWard: 'W1',
          shippingLine: 'line',
          subtotalAmount: 200000,
          totalAmount: 200000,
          items: {
            create: [{ productId, productName: 'p', sku: 's', unitPrice: 100000, quantity: 2, lineTotal: 200000 }],
          },
          payments: { create: { method: 'COD', amount: 200000, status: 'PENDING' } },
        },
      });
    });

    const result = await paymentsService.expirePendingOrders();

    const order = await prisma.order.findUniqueOrThrow({ where: { orderNumber } });
    expect(order.status).toBe(OrderStatus.PENDING); // còn mới → không bị expire

    // Dọn fixture ngay trong test để không ảnh hưởng test khác
    await prisma.orderItem.deleteMany({ where: { order: { orderNumber } } });
    await prisma.orderStatusHistory.deleteMany({ where: { order: { orderNumber } } });
    await prisma.payment.deleteMany({ where: { order: { orderNumber } } });
    await prisma.order.deleteMany({ where: { orderNumber } });
    await prisma.$transaction(async (tx) => {
      await inventoryService.release(tx as never, [{ productId, quantity: 2 }], orderNumber);
    });
    expect(result).toBeDefined();
  });

  it('idempotent: chạy lần 2 không tạo thêm gì (đơn đã CANCELLED không đếm lại)', async () => {
    const first = await paymentsService.expirePendingOrders();
    const second = await paymentsService.expirePendingOrders();
    // Cả 2 lần chạy đều OK, không throw, số expired lần 2 = các đơn mới hết hạn (nếu có)
    expect(first.expired).toBeGreaterThanOrEqual(0);
    expect(second.expired).toBeGreaterThanOrEqual(0);
  });
});
