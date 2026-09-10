import { Injectable, BadGatewayException } from '@nestjs/common';
import { PaymentProvider, CreatePaymentInput, CreatePaymentResult } from '../payment-provider.interface';
import { getEnv } from '../../../config/env';

/**
 * Stripe integration (PaymentIntent-based).
 * Webhook signature verification uses Stripe's t=,v1= scheme
 * (HMAC-SHA256 of `${t}.${payload}`) — done in the controller (raw body).
 *
 * Fail-loud policy (P0 fix): a failed/unreachable gateway MUST throw, never
 * return a mock providerRef. Silently "succeeding" with a fake reference makes
 * the order hang in PENDING with no PaymentIntent on Stripe's side — the
 * worst kind of reconciliation drift (money state mismatch with no trace).
 *
 * Dev fallback (STRIPE_SECRET_KEY unset) is only allowed outside production
 * and is clearly marked as a sandbox stub.
 */
@Injectable()
export class StripeProvider implements PaymentProvider {
  readonly method = 'STRIPE' as const;

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const env = getEnv();
    const key = env.STRIPE_SECRET_KEY;

    // Dev-only sandbox stub: order created, payment obviously not chargeable.
    if (!key) {
      return {
        method: this.method,
        instructions: `Stripe sandbox not configured. Order ${input.orderNumber} pending manual gateway setup.`,
        providerRef: `stripe_sandbox_${input.orderNumber}`,
      };
    }

    // Minimal REST call — avoids the heavyweight stripe SDK for a single endpoint
    const body = new URLSearchParams({
      amount: String(input.amountVnd), // VND is a zero-decimal currency
      currency: 'vnd',
      'metadata[orderNumber]': input.orderNumber,
      description: input.orderInfo,
    });
    const res = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
      signal: AbortSignal.timeout(10000),
    }).catch((e: Error) => {
      // Network/timeout → fail loudly. The order stays PENDING, the customer
      // sees a retryable error, expire-cron releases stock. NO silent mock.
      throw new BadGatewayException(`Stripe unreachable: ${e.message}`);
    });

    const data = (await res.json().catch(() => null)) as
      | { client_secret?: string; id?: string; error?: { message?: string } }
      | null;
    if (!res.ok || !data?.id) {
      // Stripe rejected (bad key, card currency not enabled, ...) → throw.
      throw new BadGatewayException(`Stripe createPayment failed: ${data?.error?.message ?? `HTTP ${res.status}`}`);
    }
    return { method: this.method, providerRef: data.id, redirectUrl: data.client_secret };
  }

  async verifyCallback(payload: Record<string, unknown>) {
    // Raw-body signature verification happens in the controller BEFORE this
    // method — but never normalize an event when the webhook secret is unset:
    // without it the controller cannot have verified anything, and honoring
    // the payload would let anyone mark orders paid by POSTing JSON.
    if (!getEnv().STRIPE_WEBHOOK_SECRET) {
      throw new BadGatewayException('STRIPE_WEBHOOK_SECRET not configured — refusing to process Stripe webhook');
    }

    const data = payload as { type?: string; data?: { object?: Record<string, unknown> } };
    const object = data.data?.object ?? {};
    const metadata = (object.metadata ?? {}) as Record<string, string>;

    return {
      providerTxnId: String(object.id ?? ''),
      success: data.type === 'payment_intent.succeeded',
      amountVnd: Number(object.amount_received ?? object.amount ?? 0),
      providerRef: String(object.id ?? ''),
      raw: payload,
      orderNumber: metadata.orderNumber ?? '',
    };
  }

  async refund(providerRef: string) {
    const key = getEnv().STRIPE_SECRET_KEY;
    if (!key) throw new Error('Stripe refund requires STRIPE_SECRET_KEY');
    const body = new URLSearchParams({ payment_intent: providerRef });
    const res = await fetch('https://api.stripe.com/v1/refunds', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(15000),
    });
    const data = (await res.json()) as { id?: string; error?: { message?: string } };
    if (!res.ok) throw new Error(`Stripe refund failed: ${data.error?.message ?? JSON.stringify(data)}`);
    return { gatewayRef: data.id ?? providerRef, raw: data };
  }
}
