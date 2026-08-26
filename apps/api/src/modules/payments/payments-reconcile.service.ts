import { Injectable, Logger } from '@nestjs/common';
import { PaymentStatus } from '@prisma/client';
import { PrismaService } from '../../infra/prisma.service';

/**
 * Đối soát hằng ngày: so sánh số dư DB vs báo cáo gateway.
 * Hiện tại chỉ kiểm tra nội bộ (payment SUCCESS nhưng order chưa CONFIRMED
 * và ngược lại). Khi có file báo cáo VNPay/MoMo (CSV), mở rộng
 * `reconcileWithGatewayReport()` để parse và so sánh.
 */
@Injectable()
export class PaymentsReconcileService {
  private readonly logger = new Logger(PaymentsReconcileService.name);
  constructor(private readonly prisma: PrismaService) {}

  async run(): Promise<{ checked: number; mismatched: number; details: string[] }> {
    // Lệch 1: payment SUCCESS nhưng order chưa CONFIRMED/COMPLETED
    const successPayments = await this.prisma.payment.findMany({
      where: { status: PaymentStatus.SUCCESS },
      include: { order: { select: { id: true, orderNumber: true, status: true } } },
    });
    const details: string[] = [];
    for (const p of successPayments) {
      if (!['CONFIRMED', 'PROCESSING', 'PACKING', 'SHIPPED', 'DELIVERED', 'COMPLETED'].includes(p.order.status)) {
        details.push(`PAYMENT_SUCCESS_ORDER_${p.order.status}: order ${p.order.orderNumber} payment ${p.id}`);
      }
    }

    // Lệch 2: order CONFIRMED nhưng payment chưa SUCCESS (trừ COD)
    const confirmedOrders = await this.prisma.order.findMany({
      where: { status: { in: ['CONFIRMED', 'PROCESSING', 'PACKING', 'SHIPPED'] } },
      include: { payments: true },
    });
    for (const o of confirmedOrders) {
      const pay = o.payments[0];
      if (pay && pay.method !== 'COD' && pay.status !== PaymentStatus.SUCCESS) {
        details.push(`ORDER_CONFIRMED_PAYMENT_${pay.status}: order ${o.orderNumber}`);
      }
    }

    if (details.length) this.logger.warn(`Reconcile: ${details.length} mismatches\n` + details.join('\n'));
    else this.logger.log(`Reconcile: OK — checked ${successPayments.length + confirmedOrders.length} records`);

    return { checked: successPayments.length + confirmedOrders.length, mismatched: details.length, details };
  }

  /** TODO: khi có file CSV từ VNPay/MoMo, parse và so sánh providerTxnId + amount */
  // async reconcileWithGatewayReport(csvPath: string) { ... }
}
