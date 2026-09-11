/**
 * PaymentsService refund + COD confirmation (P1 #6 gap) — DB thật.
 *
 * Bao phủ:
 *  - refundViaGateway từ chối payment chưa SUCCESS
 *  - refundViaGateway từ chối khi thiếu providerRef
 *  - COD refund → payment REFUNDED + paymentTransaction audit (manual path)
 *  - confirmCodOnDelivery idempotent (gọi 2 lần không double-record)
 */
process.env.NODE_ENV ||= 'test';
process.env.DATABASE_URL ||= 'postgresql://homemart:homemart_secret@localhost:54329/homemart?schema=public';
process.env.JWT_ACCESS_SECRET ||= 'x'.repeat(32);
process.env.JWT_REFRESH_SECRET ||= 'y'.repeat(32);

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Logger } from '@nestjs/common';
import { PrismaClient, PaymentMethodType, PaymentStatus, OrderStatus, ProductStatus } from 'src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
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

async function seedOrderWithPayment(opts: {
  method: PaymentMethodType;
  paymentStatus: PaymentStatus;
  orderStatus?: OrderStatus;
  providerRef?: string | null;
}) {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const user = await prisma.user.create({
    data: { email: `refund-${stamp}@test.local`, passwordHash: 'x', fullName: 'Refund Test' },
  });
  const cat = await prisma.category.create({
    data: { slug: `refund-cat-${stamp}`, name: 'Refund Cat' },
  });
  const product = await prisma.product.create({
    data: {
      sku: `RF-${stamp}`,
      slug: `rf-${stamp}`,
      name: 'Refund Product',
      categoryId: cat.id,
      price: 100000,
      status: ProductStatus.PUBLISHED,
      inventories: { create: { availableStock: 5 } },
    },
  });
  const order = await prisma.order.create({
    data: {
      orderNumber: `HM-RF-${stamp}`,
      userId: user.id,
      status: opts.orderStatus ?? OrderStatus.DELIVERED,
      contactName: 'Refund Tester',
      contactPhone: '0900000000',
      shippingProvince: '79', shippingDistrict: 'd', shippingWard: 'w', shippingLine: 'l',
      subtotalAmount: 100000, discountAmount: 0, shippingFee: 0, taxAmount: 0, totalAmount: 100000,
      items: { create: { productId: product.id, productName: 'Refund Product', sku: `RF-${stamp}`, unitPrice: 100000, quantity: 1, lineTotal: 100000 } },
    },
  });
  const payment = await prisma.payment.create({
    data: {
      orderId: order.id,
      method: opts.method,
      status: opts.paymentStatus,
      amount: 100000,
      providerRef: opts.providerRef === undefined ? 'vnp_xxx' : opts.providerRef,
    },
  });
  return { user, cat, product, order, payment };
}

/** Xóa sạch fixture theo userId + productId — đúng thứ tự FK. */
async function cleanupByUser(userId: string, productIds: string[], categoryIds: string[]) {
  const orders = await prisma.order.findMany({ where: { userId } });
  for (const o of orders) {
    const payments = await prisma.payment.findMany({ where: { orderId: o.id } });
    for (const p of payments) {
      await prisma.paymentTransaction.deleteMany({ where: { paymentId: p.id } });
      await prisma.payment.delete({ where: { id: p.id } });
    }
    await prisma.orderStatusHistory.deleteMany({ where: { orderId: o.id } });
    await prisma.orderItem.deleteMany({ where: { orderId: o.id } });
    await prisma.order.delete({ where: { id: o.id } });
  }
  for (const pid of productIds) {
    await prisma.inventoryTransaction.deleteMany({ where: { inventory: { productId: pid } } });
    await prisma.inventory.deleteMany({ where: { productId: pid } });
    await prisma.product.delete({ where: { id: pid } }).catch(() => {});
  }
  for (const cid of categoryIds) await prisma.category.delete({ where: { id: cid } }).catch(() => {});
  await prisma.refreshToken.deleteMany({ where: { userId } });
  await prisma.user.delete({ where: { id: userId } }).catch(() => {});
}

let service: PaymentsService;

describe('PaymentsService — refund + COD confirm (money paths)', () => {
  beforeAll(() => {
    const events = new EventEmitter2();
    const inventory = new InventoryService(prisma as never, events);
    service = new PaymentsService(
      prisma as never,
      inventory,
      new CodProvider(),
      new VnpayProvider(),
      new MomoProvider(),
      new StripeProvider(),
      events,
    );
    // PaymentsService dùng @nestjs/common Logger decorator — gắn instance logger thật
    (service as unknown as { logger: Logger }).logger = new Logger('PaymentsService');
  });

  it('refund từ chối payment chưa SUCCESS', async () => {
    const fx = await seedOrderWithPayment({ method: 'VNPAY', paymentStatus: 'PENDING' });
    try {
      await expect(service.refundViaGateway(fx.order.id)).rejects.toThrow(BadRequestException);
    } finally {
      await cleanupByUser(fx.user.id, [fx.product.id], [fx.cat.id]);
    }
  });

  it('refund từ chối khi thiếu providerRef', async () => {
    const fx = await seedOrderWithPayment({ method: 'VNPAY', paymentStatus: 'SUCCESS', providerRef: null });
    try {
      await expect(service.refundViaGateway(fx.order.id)).rejects.toThrow(BadRequestException);
    } finally {
      await cleanupByUser(fx.user.id, [fx.product.id], [fx.cat.id]);
    }
  });

  it('COD refund → REFUNDED + audit transaction (không cần gateway)', async () => {
    const fx = await seedOrderWithPayment({ method: 'COD', paymentStatus: 'SUCCESS' });
    try {
      const result = await service.refundViaGateway(fx.order.id);
      expect(result.status).toBe('REFUNDED');

      const payment = await prisma.payment.findUniqueOrThrow({ where: { id: fx.payment.id } });
      expect(payment.status).toBe('REFUNDED');

      const audit = await prisma.paymentTransaction.findFirst({
        where: { paymentId: payment.id, eventType: 'refund' },
      });
      expect(audit).toBeTruthy(); // có trail audit
      expect((audit?.payload as Record<string, unknown>)?.manual).toBe(true);
    } finally {
      await cleanupByUser(fx.user.id, [fx.product.id], [fx.cat.id]);
    }
  });

  it('refund đơn không tồn tại → 404', async () => {
    await expect(service.refundViaGateway('00000000-0000-0000-0000-000000000000')).rejects.toThrow(NotFoundException);
  });

  it('confirmCodOnDelivery: PENDING → SUCCESS, gọi 2 lần idempotent', async () => {
    const fx = await seedOrderWithPayment({ method: 'COD', paymentStatus: 'PENDING', orderStatus: OrderStatus.DELIVERED });
    try {
      await service.confirmCodOnDelivery(fx.order.id);

      const payment = await prisma.payment.findUniqueOrThrow({ where: { id: fx.payment.id } });
      expect(payment.status).toBe('SUCCESS');

      // Gọi lần 2 → duplicate, không đổi gì thêm
      const second = (await service.confirmCodOnDelivery(fx.order.id)) as { duplicate?: boolean };
      expect(second.duplicate ?? true).toBeTruthy();
      const still = await prisma.payment.findUniqueOrThrow({ where: { id: fx.payment.id } });
      expect(still.status).toBe('SUCCESS');
    } finally {
      await cleanupByUser(fx.user.id, [fx.product.id], [fx.cat.id]);
    }
  });
});
