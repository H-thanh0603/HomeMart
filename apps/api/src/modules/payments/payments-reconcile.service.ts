import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PaymentStatus } from '@prisma/client';
import { PrismaService } from '../../infra/prisma.service';

/**
 * Đối soát hằng ngày: so sánh số dư DB vs báo cáo gateway.
 * - `run()`: kiểm tra nội bộ (payment SUCCESS nhưng order chưa CONFIRMED và ngược lại)
 * - `reconcileWithGatewayReport(csv)`: parse CSV export từ VNPay/MoMo merchant portal
 *   và so providerTxnRef + amount với DB (issue 1.2)
 */

export interface GatewayReportRow {
  providerRef: string; // vnp_TxnRef / MoMo orderId — match Payment.providerRef
  amountVnd: number;
  status: string; // 'SUCCESS' | 'FAIL' | anything else
  raw: string[];
}

export interface GatewayReportResult {
  provider: 'VNPAY' | 'MOMO';
  rows: number;
  matched: number;
  mismatched: GatewayReportMismatch[];
  missingInDb: GatewayReportRow[];
}

export interface GatewayReportMismatch {
  providerRef: string;
  dbAmount: number;
  reportAmount: number;
  dbStatus: string;
  reportStatus: string;
}
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

  /**
   * Parse + đối soát file CSV export từ merchant portal VNPay/MoMo.
   *
   * VNPay export: cột chứa `vnp_TxnRef` (hoặc tên cột TxnRef/Mã giao dịch),
   * `vnp_Amount`/Số tiền (đơn vị VND hoặc x100), `vnp_ResponseCode`/Mã phản hồi.
   * MoMo export: `orderId`, `amount`, `resultCode`.
   *
   * Heuristic: duyệt header, tìm cột theo tên; không phụ thuộc thứ tự cột.
   */
  async reconcileWithGatewayReport(provider: 'VNPAY' | 'MOMO', csv: string): Promise<GatewayReportResult> {
    const rows = this.parseCsv(csv);
    if (!rows.length) throw new BadRequestException('CSV rỗng hoặc không parse được');

    const header = rows[0].map((h) => this.normalizeHeader(h));
    const refIdx = header.findIndex((h) =>
      provider === 'VNPAY' ? /txnref|mã giao dịch|merchant_txn_ref/i.test(h) : /order_?id|partner_order/i.test(h),
    );
    const amountIdx = header.findIndex((h) => /amount|số tiền/i.test(h));
    const statusIdx = header.findIndex((h) => /response_?code|result_?code|mã phản hồi|status/i.test(h));
    if (refIdx === -1 || amountIdx === -1) {
      throw new BadRequestException(
        `Không tìm thấy cột tham chiếu/số tiền trong CSV ${provider} (header: ${header.join(', ')})`,
      );
    }

    const reportRows: GatewayReportRow[] = [];
    for (const cells of rows.slice(1)) {
      if (!cells[refIdx]?.trim()) continue;
      let amount = Number(String(cells[amountIdx]).replace(/[^\d.-]/g, ''));
      // ponytail: VNPay export có thể ở đơn vị x100 (như vnp_Amount) — heuristic
      // >10x DB amount sẽ báo mismatch, người vận hành kiểm tra lại.
      if (provider === 'VNPAY' && amount % 100 === 0 && amount > 100000) amount = amount / 100;
      reportRows.push({
        providerRef: cells[refIdx].trim(),
        amountVnd: amount,
        status: statusIdx === -1 ? 'SUCCESS' : this.normalizeStatus(provider, cells[statusIdx]),
        raw: cells,
      });
    }

    const payments = await this.prisma.payment.findMany({
      where: { method: provider, providerRef: { in: reportRows.map((r) => r.providerRef) } },
      select: { providerRef: true, amount: true, status: true, order: { select: { orderNumber: true } } },
    });
    const byRef = new Map(payments.map((p) => [p.providerRef as string, p]));

    const mismatched: GatewayReportMismatch[] = [];
    const missingInDb: GatewayReportRow[] = [];
    let matched = 0;
    for (const row of reportRows) {
      const payment = byRef.get(row.providerRef);
      if (!payment) {
        missingInDb.push(row);
        continue;
      }
      const amountOk = payment.amount === row.amountVnd;
      const statusOk = (row.status === 'SUCCESS') === (payment.status === PaymentStatus.SUCCESS);
      if (!amountOk || !statusOk) {
        mismatched.push({
          providerRef: row.providerRef,
          dbAmount: payment.amount,
          reportAmount: row.amountVnd,
          dbStatus: payment.status,
          reportStatus: row.status,
        });
      } else {
        matched++;
      }
    }

    const result: GatewayReportResult = { provider, rows: reportRows.length, matched, mismatched, missingInDb };
    if (mismatched.length || missingInDb.length) {
      this.logger.warn(
        `Reconcile ${provider} CSV: ${mismatched.length} lệch, ${missingInDb.length} thiếu trong DB (xem audit-log / admin response)`,
      );
    } else {
      this.logger.log(`Reconcile ${provider} CSV: OK — ${matched}/${reportRows.length} khớp`);
    }
    return result;
  }

  /** Minimal RFC-4180-ish CSV parser: quotes, embedded commas, CRLF. */
  private parseCsv(csv: string): string[][] {
    const rows: string[][] = [];
    let row: string[] = [];
    let cell = '';
    let quoted = false;
    for (let i = 0; i < csv.length; i++) {
      const c = csv[i];
      if (quoted) {
        if (c === '"' && csv[i + 1] === '"') {
          cell += '"';
          i++;
        } else if (c === '"') {
          quoted = false;
        } else {
          cell += c;
        }
      } else if (c === '"') {
        quoted = true;
      } else if (c === ',') {
        row.push(cell);
        cell = '';
      } else if (c === '\n' || c === '\r') {
        if (c === '\r' && csv[i + 1] === '\n') i++;
        row.push(cell);
        if (row.some((x) => x.trim())) rows.push(row);
        row = [];
        cell = '';
      } else {
        cell += c;
      }
    }
    row.push(cell);
    if (row.some((x) => x.trim())) rows.push(row);
    return rows;
  }

  private normalizeHeader(h: string): string {
    return h.trim().replace(/^\uFEFF/, '').toLowerCase().replace(/\s+/g, '_');
  }

  private normalizeStatus(provider: 'VNPAY' | 'MOMO', raw: string): string {
    const v = raw.trim();
    if (provider === 'VNPAY') return v === '00' ? 'SUCCESS' : 'FAIL';
    return ['0', '00', 'SUCCESSFUL', 'SUCCESS'].includes(v.toUpperCase()) ? 'SUCCESS' : 'FAIL';
  }
}
