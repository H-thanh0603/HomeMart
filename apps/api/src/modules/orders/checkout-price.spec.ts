/**
 * Checkout price-change guard (P1 #6 gap) — DB thật.
 *
 * Kịch bản tấn công thật: khách preview giá 100k → trong lúc fill form,
 * admin đổi giá lên 120k → khách submit với preview cũ. Nếu checkout tin
 * subtotal client gửi, khách trả giá cũ (hoặc tệ hơn: đổi ngược lại để
 * được giảm giá). BR-1: backend re-price INSIDE transaction, mismatch →
 * throw PRICE_CHANGED → KHÔNG tạo đơn với giá sai.
 */
process.env.NODE_ENV ||= 'test';
process.env.DATABASE_URL ||= 'postgresql://homemart:homemart_secret@localhost:54329/homemart?schema=public';
process.env.JWT_ACCESS_SECRET ||= 'x'.repeat(32);
process.env.JWT_REFRESH_SECRET ||= 'y'.repeat(32);

import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaClient, ProductStatus, ShippingMethodCode } from 'src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { randomUUID } from 'crypto';
import { OrdersService, type CheckoutDto } from './orders.service';
import { InventoryService } from '../inventory/inventory.service';
import { PromotionsService } from '../promotions/promotions.service';
import { ShippingService } from '../shipping/shipping.service';
import { RedisService } from '../../infra/redis.service';
import type { PrismaService } from '../../infra/prisma.service';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

jest.setTimeout(30000);

async function seedFixture() {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const user = await prisma.user.create({
    data: { email: `price-${stamp}@test.local`, passwordHash: 'x', fullName: 'Price Test' },
  });
  const address = await prisma.address.create({
    data: {
      userId: user.id, fullName: 'Price Tester', phone: '0900000000',
      province: '79', district: 'd', ward: 'w', line: 'l', isDefault: true,
    },
  });
  const method = await prisma.shippingMethod.findFirst({ where: { code: ShippingMethodCode.STANDARD } })
    ?? (await prisma.shippingMethod.create({
      data: { code: ShippingMethodCode.STANDARD, name: 'Test Std', baseFee: 30000, feePerKg: 5000, estimatedDaysMin: 2, estimatedDaysMax: 5, isActive: true },
    }));
  const product = await prisma.product.create({
    data: {
      sku: `PC-${stamp}`, slug: `pc-${stamp}`, name: 'Price Change Product',
      categoryId: (await prisma.category.findFirstOrThrow()).id,
      price: 100000, weightGrams: 500, status: ProductStatus.PUBLISHED,
      inventories: { create: { availableStock: 10 } },
    },
  });
  return { user, address, method, product };
}

async function cleanup(user: { id: string }, product: { id: string }) {
  const orders = await prisma.order.findMany({ where: { userId: user.id } });
  for (const o of orders) {
    await prisma.payment.deleteMany({ where: { orderId: o.id } });
    // createShipment chạy fire-and-forget sau checkout — đợi nó insert xong
    // rồi xóa, nếu không sẽ FK violation (shipments_orderId_fkey).
    for (let i = 0; i < 20; i++) {
      const n = await prisma.shipment.count({ where: { orderId: o.id } });
      if (n > 0) break;
      await new Promise((r) => setTimeout(r, 50));
    }
    await prisma.shipment.deleteMany({ where: { orderId: o.id } });
    await prisma.idempotencyRecord.deleteMany({ where: { orderId: o.id } });
    await prisma.orderStatusHistory.deleteMany({ where: { orderId: o.id } });
    await prisma.orderItem.deleteMany({ where: { orderId: o.id } });
    await prisma.order.delete({ where: { id: o.id } });
  }
  await prisma.inventoryTransaction.deleteMany({ where: { inventory: { productId: product.id } } });
  await prisma.inventory.deleteMany({ where: { productId: product.id } });
  await prisma.product.delete({ where: { id: product.id } });
  await prisma.address.deleteMany({ where: { userId: user.id } });
  await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
  await prisma.user.delete({ where: { id: user.id } });
}

let orders: OrdersService;

describe('OrdersService.checkout — price-change-during-checkout (BR-1)', () => {
  beforeAll(() => {
    const events = new EventEmitter2();
    const inventory = new InventoryService(prisma as never, events);
    const promotions = new PromotionsService(prisma as never);
    // RedisService lazy-connect — test không chạm redis path của computeFee
    const redisStub = { get: jest.fn(), set: jest.fn(), del: jest.fn(), tryLock: jest.fn(async () => true) } as never;
    const shipping = new (ShippingService as unknown as new (
      prisma: PrismaService, events: EventEmitter2, redis: RedisService,
    ) => ShippingService)(prisma as never, events, redisStub);
    orders = new OrdersService(prisma as never, inventory, promotions, shipping, events);
  });

  it('giá đổi TRƯỚC checkout → đơn được tạo với giá MỚI (backend luôn thắng, không tin preview cũ)', async () => {
    const fx = await seedFixture();
    try {
      const dto: CheckoutDto = {
        items: [{ productId: fx.product.id, quantity: 1 }],
        addressId: fx.address.id,
        shippingMethodId: fx.method.id,
        paymentMethod: 'COD',
      };

      // Khách đã preview với giá 100k
      const preview = await orders.preview(fx.user.id, dto);
      expect(preview.subtotalAmount).toBe(100000);

      // Admin đổi giá trong lúc khách submit form
      await prisma.product.update({ where: { id: fx.product.id }, data: { price: 120000 } });

      // Checkout: backend re-price bằng giá DB hiện hành (BR-1) — KHÔNG dùng
      // preview cũ. Khách không bao giờ bị tính giá cũ sau khi admin tăng giá.
      const order = await orders.checkout(fx.user.id, dto, randomUUID());
      expect(order.status).toBe('PENDING');
      expect(order.subtotalAmount).toBe(120000); // giá MỚI thắng preview CŨ
      expect(order.items[0].unitPrice).toBe(120000);
      // Tổng = 120k + ship + tax — không thể thấp hơn subtotal
      expect(order.totalAmount).toBeGreaterThan(120000);
    } finally {
      await cleanup(fx.user, fx.product);
    }
  });

  it('giá đổi GIỮA pre-check và in-tx re-price → PRICE_CHANGED, KHÔNG tạo đơn', async () => {
    const fx = await seedFixture();
    try {
      const dto: CheckoutDto = {
        items: [{ productId: fx.product.id, quantity: 1 }],
        addressId: fx.address.id,
        shippingMethodId: fx.method.id,
        paymentMethod: 'COD',
      };

      // Cài bẫy: monkey-patch prisma.product.findMany để đổi giá sau lần pre-check
      // (mô phỏng race thật: admin UPDATE chui vào giữa 2 lần đọc của checkout)
      const original = fx.product;
      let firstRead = true;
      const realFindMany = prisma.product.findMany.bind(prisma.product);
      (prisma.product as { findMany: typeof prisma.product.findMany }).findMany = (async (args: unknown) => {
        const rows = await realFindMany(args as never);
        if (firstRead && Array.isArray(rows) && rows.some((r: { id: string }) => r.id === original.id)) {
          firstRead = false;
          // Đổi giá NGAY sau khi pre-check đọc xong, TRƯỚC khi tx re-price đọc
          await realUpdate(original.id, 150000);
        }
        return rows;
      }) as typeof prisma.product.findMany;

      const realUpdate = async (productId: string, price: number) => {
        await prisma.$executeRaw`UPDATE products SET price = ${price} WHERE id = ${productId}::text`;
      };

      try {
        await expect(orders.checkout(fx.user.id, dto, randomUUID())).rejects.toThrow('prices have changed');

        // KHÔNG có đơn nào được tạo
        const count = await prisma.order.count({ where: { userId: fx.user.id } });
        expect(count).toBe(0);

        // Kho không bị giữ chỗ (reserve đã rollback cùng tx)
        const inv = await prisma.inventory.findFirstOrThrow({ where: { productId: fx.product.id } });
        expect(inv.reservedStock).toBe(0);
        expect(inv.availableStock).toBe(10);
      } finally {
        // Restore monkey-patch
        prisma.product.findMany = realFindMany;
      }
    } finally {
      await cleanup(fx.user, fx.product);
    }
  });
});
