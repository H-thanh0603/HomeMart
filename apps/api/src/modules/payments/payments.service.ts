import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PaymentMethodType, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../../infra/prisma.service';
import { BusinessRuleError } from '../../common/exceptions/business.errors';
import { InventoryService } from '../inventory/inventory.service';
import { CreatePaymentResult, PaymentProvider } from './payment-provider.interface';
import { CodProvider } from './providers/cod.provider';
import { MomoProvider } from './providers/momo.provider';
import { StripeProvider } from './providers/stripe.provider';
import { VnpayProvider } from './providers/vnpay.provider';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly providers: Map<PaymentMethodType, PaymentProvider>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly inventory: InventoryService,
    cod: CodProvider,
    vnpay: VnpayProvider,
    momo: MomoProvider,
    stripe: StripeProvider,
    private readonly events: EventEmitter2,
  ) {
    this.providers = new Map<PaymentMethodType, PaymentProvider>([
      [cod.method, cod],
      [vnpay.method, vnpay],
      [momo.method, momo],
      [stripe.method, stripe],
    ]);
  }

  async getStatus(userId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, select: { userId: true } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.userId !== userId) throw new ForbiddenException('Not your order');
    return this.prisma.payment.findUnique({ where: { orderId }, include: { transactions: false } });
  }

  /** Initiate payment for a PENDING order. */
  async createPayment(userId: string, orderId: string, clientIp?: string): Promise<{ orderId: string; payment: CreatePaymentResult }> {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, deletedAt: null },
      include: { payments: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.userId !== userId) throw new ForbiddenException('Not your order');

    const payment = order.payments[0];
    if (!payment) throw new NotFoundException('Payment record missing');
    if (payment.status === PaymentStatus.SUCCESS) {
      throw new BusinessRuleError('Order already paid', 'ALREADY_PAID');
    }
    if (order.status === 'CANCELLED') throw new BusinessRuleError('Order is cancelled', 'ORDER_CANCELLED');

    const provider = this.providers.get(payment.method as PaymentMethodType);
    const effectiveMethod = (provider?.method ?? payment.method) as PaymentMethodType;
    if (!provider && payment.method !== 'BANK_TRANSFER') {
      throw new BadRequestException(`Unsupported payment method ${payment.method}`);
    }

    let result: CreatePaymentResult;
    if (provider) {
      result = await provider.createPayment({
        orderNumber: order.orderNumber,
        amountVnd: order.totalAmount,
        orderInfo: `HomeMart thanh toán đơn ${order.orderNumber}`,
        clientIp,
      });
    } else {
      // BANK_TRANSFER
      result = {
        method: 'BANK_TRANSFER',
        instructions: 'Chuyển khoản Vietcombank — STK 0123456789 HOME MART CO., LTD — nội dung: ' + order.orderNumber,
        providerRef: `BT-${order.orderNumber}`,
      };
    }

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'PROCESSING', providerRef: result.providerRef },
    });
    return { orderId: order.id, payment: { ...result, method: effectiveMethod } };
  }

  /**
   * Normalized webhook handling. BR-4:
   * - signature verified by provider before this
   * - duplicate (providerTxnId,eventType) → ignored, returns OK
   * - only PENDING/PROCESSING → SUCCESS transition commits sale & confirms order
   */
  async handleWebhook(
    method: PaymentMethodType,
    eventType: string,
    normalized: { providerTxnId: string; success: boolean; amountVnd: number; orderNumber?: string; raw: Record<string, unknown> },
  ) {
    // Locate the payment by our issued reference (robust — no order-number parsing)
    let payment = normalized.raw
      ? await this.prisma.payment.findUnique({
          where: { providerRef: (normalized.raw.providerRef as string) ?? '' },
        })
      : null;
    if (!payment && normalized.orderNumber) {
      payment = await this.prisma.payment.findFirst({
        where: { order: { orderNumber: normalized.orderNumber } },
      });
    }
    if (!payment) {
      this.logger.warn(`${method} webhook could not locate a payment`, JSON.stringify(normalized).slice(0, 300));
      return { handled: false, reason: 'PAYMENT_NOT_FOUND' };
    }
    const orderId = payment.orderId;
    const order = await this.prisma.order.findFirst({
      where: { id: orderId },
      include: { payments: true, items: true },
    });
    if (!order) return { handled: false, reason: 'ORDER_NOT_FOUND' };
    const outcome = await this.prisma.$transaction(async (tx) => {
      // Idempotency check #2: unique(providerTxnId,eventType)
      try {
        await tx.paymentTransaction.create({
          data: {
            paymentId: payment.id,
            providerTxnId: normalized.providerTxnId,
            eventType,
            payload: normalized.raw as object,
            signatureValid: true,
          },
        });
      } catch {
        this.logger.log(`Duplicate ${method} callback ignored: ${normalized.providerTxnId}/${eventType}`);
        return { handled: false, duplicate: true };
      }

      if (!normalized.success) {
        if (['PENDING', 'PROCESSING'].includes(payment.status)) {
          await tx.payment.update({
            where: { id: payment.id },
            data: { status: 'FAILED', failedReason: `Gateway reported failure (${eventType})` },
          });
          return { handled: true, status: 'FAILED' };
        }
        return { handled: false, duplicate: true };
      }

      // Amount mismatch guard
      if (normalized.amountVnd && Math.abs(normalized.amountVnd - order.totalAmount) > 1) {
        this.logger.error(`Amount mismatch order ${order.orderNumber}: got ${normalized.amountVnd}, expected ${order.totalAmount}`);
        await tx.payment.update({
          where: { id: payment.id },
          data: { status: 'FAILED', failedReason: 'Amount mismatch' },
        });
        return { handled: true, status: 'FAILED', reason: 'AMOUNT_MISMATCH' };
      }

      // State guard: only PENDING/PROCESSING can become SUCCESS
      if (!['PENDING', 'PROCESSING'].includes(payment.status)) {
        return { handled: false, duplicate: true };
      }

      await tx.payment.update({
        where: { id: payment.id },
        data: { status: 'SUCCESS', paidAt: new Date(), providerRef: normalized.providerTxnId },
      });

      // Commit reserved stock → sold (idempotent-ish: guarded by payment state above)
      await this.inventory.commitSale(tx, order.items.map((i) => ({
        productId: i.productId, variantId: i.variantId, quantity: i.quantity,
      })), order.orderNumber);

      // Confirm order through the state machine semantics (PENDING→CONFIRMED)
      await tx.orderStatusHistory.create({
        data: { orderId: order.id, fromStatus: order.status, toStatus: 'CONFIRMED', actorId: null, note: `Payment success via ${method}` },
      });
      await tx.$queryRaw`UPDATE orders SET status = 'CONFIRMED'::"OrderStatus", version = version + 1, "confirmedAt" = NOW() WHERE id = ${order.id}`;

      return { handled: true, status: 'SUCCESS' };
    });

    if ('status' in outcome && outcome.status === 'SUCCESS') {
      this.events.emit('payment.succeeded', { orderId: order.id, userId: order.userId, orderNumber: order.orderNumber });
      this.logger.log(`Payment SUCCESS for ${order.orderNumber} via ${method}`);
    }
    return outcome;
  }

  /**
   * COD delivery confirmation (internal call when shipment delivered).
   */
  async confirmCodOnDelivery(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payments: true, items: true },
    });
    if (!order?.payments[0]) throw new NotFoundException('Payment not found');
    const payment = order.payments[0];
    if (payment.status === PaymentStatus.SUCCESS) return { handled: false, duplicate: true };

    return this.handleWebhook('COD', 'delivery_confirmation', {
      providerTxnId: `COD-${order.orderNumber}`,
      success: true,
      amountVnd: order.totalAmount,
      orderNumber: order.orderNumber,
      raw: { source: 'internal', orderId, providerRef: payment.providerRef ?? `COD-${order.orderNumber}` },
    });
  }

  /** Cron/manual: expire unpaid orders after timeout and release stock. */
  async expirePendingOrders() {
    const timeoutMin = Number(process.env.ORDER_PAYMENT_TIMEOUT_MINUTES ?? 30);
    const cutoff = new Date(Date.now() - timeoutMin * 60e3);
    const stale = await this.prisma.order.findMany({
      where: { status: 'PENDING', createdAt: { lt: cutoff } },
      include: { items: true },
    });
    let expired = 0;
    for (const order of stale) {
      try {
        await this.prisma.$transaction(async (tx) => {
          const updated = await tx.$queryRaw<{ id: string }[]>`
            UPDATE orders SET status = 'CANCELLED'::"OrderStatus", version = version + 1, cancelled_reason = 'payment_timeout'
            WHERE id = ${order.id} AND status = 'PENDING'
            RETURNING id`;
          if (!updated.length) return;
          await tx.orderStatusHistory.create({
            data: { orderId: order.id, fromStatus: 'PENDING', toStatus: 'CANCELLED', note: 'Payment timeout' },
          });
          await tx.payment.updateMany({
            where: { orderId: order.id, status: { in: ['PENDING', 'PROCESSING'] } },
            data: { status: 'CANCELLED', failedReason: 'Payment timeout' },
          });
          await this.inventory.release(tx, order.items.map((i) => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity })), order.orderNumber);
          expired++;
        });
      } catch (e) {
        this.logger.warn(`Failed expiring order ${order.orderNumber}: ${(e as Error).message}`);
      }
    }
    return { expired };
  }
}
