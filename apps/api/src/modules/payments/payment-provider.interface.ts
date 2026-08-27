import { PaymentMethodType } from '@prisma/client';

export interface CreatePaymentInput {
  orderNumber: string;
  amountVnd: number;
  orderInfo: string;
  clientIp?: string;
}

export interface CreatePaymentResult {
  method: PaymentMethodType;
  redirectUrl?: string; // hosted gateway (VNPay/MoMo/Stripe)
  qrCode?: string;
  instructions?: string; // COD / bank transfer
  providerRef: string; // our unique txn reference
}

/**
 * BR-4 contract: every provider must verify signatures on callbacks
 * and map to a normalized IPN payload. Idempotency is enforced by PaymentsService.
 */
export interface PaymentProvider {
  readonly method: PaymentMethodType;
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
  /** Verify callback signature & normalize. Throw when signature invalid. */
  verifyCallback(payload: Record<string, unknown>): Promise<{
    providerTxnId: string;
    success: boolean;
    amountVnd: number;
    /** Our reference issued during createPayment — used to locate the payment. */
    providerRef: string;
    raw: Record<string, unknown>;
  }>;
  /** Refund a captured payment. Throw when gateway rejects. */
  refund?(providerRef: string, amountVnd: number, orderNumber: string): Promise<{ gatewayRef: string; raw?: unknown }>;
}
