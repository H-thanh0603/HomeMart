import { Injectable } from '@nestjs/common';
import { PaymentProvider, CreatePaymentInput, CreatePaymentResult } from '../payment-provider.interface';

@Injectable()
export class CodProvider implements PaymentProvider {
  readonly method = 'COD' as const;

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    return {
      method: this.method,
      instructions: `Thanh toán bằng tiền mặt khi nhận hàng. Đơn hàng ${input.orderNumber}: ${input.amountVnd}₫`,
      providerRef: `COD-${input.orderNumber}`,
    };
  }

  /** COD "callback" happens on delivery — driver confirms; no signature needed (trusted internal). */
  async verifyCallback(payload: Record<string, unknown>) {
    return {
      providerTxnId: String(payload.providerTxnId ?? `COD-${payload.orderNumber}`),
      success: payload.success !== false,
      amountVnd: Number(payload.amountVnd ?? 0),
      providerRef: String(payload.providerTxnId ?? `COD-${payload.orderNumber}`),
      raw: payload,
    };
  }
}
