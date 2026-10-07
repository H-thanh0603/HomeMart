import { EventEmitter2 } from '@nestjs/event-emitter';
import { OrderStatus, PaymentMethodType, PaymentStatus } from 'src/generated/prisma/client';
import { OrdersService } from './orders.service';
import { BusinessRuleError } from '../../common/exceptions/business.errors';
import { InventoryService } from '../inventory/inventory.service';
import { PromotionsService } from '../promotions/promotions.service';
import { ShippingService } from '../shipping/shipping.service';
import { PrismaService } from '../../infra/prisma.service';

process.env.NODE_ENV ||= 'test';
process.env.DATABASE_URL ||= 'postgresql://homemart:homemart_secret@localhost:54329/homemart';
process.env.JWT_ACCESS_SECRET ||= 'x'.repeat(32);
process.env.JWT_REFRESH_SECRET ||= 'y'.repeat(32);

/**
 * Unit tests for the paid-order cancellation guard (money-path integrity):
 * a customer must never be able to flip a paid order's payment to REFUNDED —
 * gateway refunds go through OrdersService/PaymentsService with approval.
 */
describe('OrdersService — paid-order cancel guard', () => {
  const USER_A = 'user-a';
  const ORDER_ID = 'order-1';

  const baseOrder = {
    id: ORDER_ID,
    userId: USER_A,
    orderNumber: 'ORD-1-1',
    status: OrderStatus.CONFIRMED,
    version: 1,
    voucherCode: null,
    items: [{ productId: 'p1', variantId: null, quantity: 2 }],
  };

  function buildService(opts: { rootPayment: { status: string; method: string } | null; txPayment?: { status: string; method: string } | null }) {
    const paymentUpdate = jest.fn(async () => ({}));
    const release = jest.fn(async () => undefined);
    const emit = jest.fn();

    const tx = {
      order: { findUnique: async () => ({ ...baseOrder }) },
      $queryRaw: async () => [{ id: ORDER_ID }],
      orderStatusHistory: { create: async () => ({}) },
      payment: {
        findUnique: async () => (opts.txPayment !== undefined ? opts.txPayment : opts.rootPayment),
        update: paymentUpdate,
      },
      shipment: { findUnique: async () => null },
    };

    const prisma = {
      order: { findFirst: async () => ({ ...baseOrder, items: [...baseOrder.items] }) },
      payment: { findUnique: async () => opts.rootPayment },
      $transaction: async (fn: (tx: never) => unknown) => fn(tx as never),
    } as unknown as PrismaService;

    const inventory = { release } as unknown as InventoryService;
    const promotions = { refundUsage: jest.fn() } as unknown as PromotionsService;
    const events = { emit } as unknown as EventEmitter2;
    const service = new OrdersService(prisma, inventory, promotions, {} as ShippingService, events);
    return { service, paymentUpdate, release, emit };
  }

  it('customer CANNOT self-cancel a paid (SUCCESS) order — must use the return flow', async () => {
    const { service, release } = buildService({
      rootPayment: { status: PaymentStatus.SUCCESS, method: PaymentMethodType.VNPAY },
    });
    await expect(service.cancel(USER_A, ORDER_ID)).rejects.toThrow(BusinessRuleError);
    await expect(service.cancel(USER_A, ORDER_ID)).rejects.toThrow('Đơn đã thanh toán');
    expect(release).not.toHaveBeenCalled();
  });

  it('unpaid order cancel → CANCELLED, stock released, payment untouched', async () => {
    const { service, paymentUpdate, release, emit } = buildService({
      rootPayment: { status: PaymentStatus.PENDING, method: PaymentMethodType.COD },
    });
    const order = await service.cancel(USER_A, ORDER_ID);
    expect(order).toBeTruthy();
    expect(release).toHaveBeenCalledTimes(1);
    expect(paymentUpdate).not.toHaveBeenCalled();
    expect(emit).toHaveBeenCalledWith('order.cancelled', expect.objectContaining({ orderId: ORDER_ID }));
  });

  it('manager cancels a gateway-paid order → payment stays SUCCESS (refund via refundViaGateway), stock released', async () => {
    const { service, paymentUpdate, release, emit } = buildService({
      rootPayment: { status: PaymentStatus.SUCCESS, method: PaymentMethodType.VNPAY },
    });
    await service.transition(ORDER_ID, OrderStatus.CANCELLED, 'manager-1', 'ops', 'MANAGER');
    expect(release).toHaveBeenCalledTimes(1);
    expect(paymentUpdate).not.toHaveBeenCalled();
    expect(emit).not.toHaveBeenCalledWith('refund.succeeded', expect.anything());
  });

  it('manager cancels a COD-paid order → manual refund: payment REFUNDED + event', async () => {
    const { service, paymentUpdate, release, emit } = buildService({
      rootPayment: { status: PaymentStatus.SUCCESS, method: PaymentMethodType.COD },
    });
    await service.transition(ORDER_ID, OrderStatus.CANCELLED, 'manager-1', 'ops', 'MANAGER');
    expect(paymentUpdate).toHaveBeenCalledWith({ where: { orderId: ORDER_ID }, data: { status: PaymentStatus.REFUNDED } });
    expect(release).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenCalledWith('refund.succeeded', expect.objectContaining({ orderId: ORDER_ID }));
  });

  it('customer return request: allowed for paid pre-ship orders, rejected for unpaid ones', async () => {
    const paid = buildService({ rootPayment: { status: PaymentStatus.SUCCESS, method: PaymentMethodType.VNPAY } });
    const returned = await paid.service.requestReturn(USER_A, ORDER_ID);
    expect(returned).toBeTruthy();

    const unpaid = buildService({ rootPayment: { status: PaymentStatus.PENDING, method: PaymentMethodType.VNPAY } });
    await expect(unpaid.service.requestReturn(USER_A, ORDER_ID)).rejects.toThrow('Return not allowed at this stage');
  });
});
