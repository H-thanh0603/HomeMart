import { Injectable } from '@nestjs/common';
import { PaymentProvider, CreatePaymentInput, CreatePaymentResult } from '../payment-provider.interface';
import { getEnv } from '../../../config/env';

/**
 * Stripe integration (PaymentIntent-based).
 * When STRIPE_SECRET_KEY is unset (dev), falls back to a deterministic mock ref.
 * Webhook signature verification uses Stripe's t=,v1= scheme (HMAC-SHA256 of `${t}.${payload}`).
 */
@Injectable()
export class StripeProvider implements PaymentProvider {
  readonly method = 'STRIPE' as const;

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const key = getEnv().STRIPE_SECRET_KEY;
    const providerRef = `stripe_${input.orderNumber}_${Date.now()}`;

    if (!key) {
      return {
        method: this.method,
        instructions: `Stripe sandbox not configured. Order ${input.orderNumber} pending manual gateway setup.`,
        providerRef,
      };
    }

    // Minimal REST call — avoids the heavyweight stripe SDK for a single endpoint
    const body = new URLSearchParams({
      amount: String(input.amountVnd), // VND is a zero-decimal currency
      currency: 'vnd',
      'metadata[orderNumber]': input.orderNumber,
      description: input.orderInfo,
    });
    try {
      const res = await fetch('https://api.stripe.com/v1/payment_intents', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
        signal: AbortSignal.timeout(10000),
      });
      const data = (await res.json()) as { client_secret?: string; id?: string };
      return { method: this.method, providerRef: data.id ?? providerRef, redirectUrl: data.client_secret };
    } catch {
      return { method: this.method, providerRef };
    }
  }

  async verifyCallback(payload: Record<string, unknown>) {
    // Raw-body signature verification happens in the controller before this normalization
    const data = payload as { type?: string; data?: { object?: Record<string, unknown> } };
    const object = data.data?.object ?? {};
    const metadata = (object.metadata ?? {}) as Record<string, string>;

    return {
      providerTxnId: String(object.id ?? `evt_${Date.now()}`),
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
