import { Injectable } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import { getEnv } from '../../../config/env';
import { PaymentProvider, CreatePaymentInput, CreatePaymentResult } from '../payment-provider.interface';

/** MoMo v2 integration (sandbox-compatible). Signature: HMAC-SHA256. */
@Injectable()
export class MomoProvider implements PaymentProvider {
  readonly method = 'MOMO' as const;

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const env = getEnv();
    const providerRef = `${input.orderNumber}-${Date.now()}`;
    const orderInfo = input.orderInfo;
    const redirectUrl = env.MOMO_RETURN_URL;
    const ipnUrl = `${env.WEB_URL ?? 'http://localhost:3000'}/api/v1/payments/webhook/momo`;
    const requestType = 'captureWallet';
    const rawSignature = `accessKey=${env.MOMO_ACCESS_KEY}&amount=${input.amountVnd}&extraData=&ipnUrl=${ipnUrl}&orderId=${providerRef}&orderInfo=${orderInfo}&partnerCode=${env.MOMO_PARTNER_CODE}&redirectUrl=${redirectUrl}&requestId=${providerRef}&requestType=${requestType}`;
    const signature = createHmac('sha256', env.MOMO_SECRET_KEY ?? '').update(rawSignature).digest('hex');

    const body = {
      partnerCode: env.MOMO_PARTNER_CODE,
      requestId: providerRef,
      amount: input.amountVnd,
      orderId: providerRef,
      orderInfo,
      redirectUrl,
      ipnUrl,
      requestType,
      extraData: '',
      signature,
      lang: 'vi',
    };

    try {
      const res = await fetch(env.MOMO_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10000),
      });
      const data = (await res.json()) as { payUrl?: string; qrCodeUrl?: string; resultCode?: number };
      return {
        method: this.method,
        redirectUrl: data.payUrl,
        qrCode: data.qrCodeUrl,
        providerRef,
      };
    } catch {
      // Gateway unreachable — still return ref so payment stays PENDING and can be retried
      return { method: this.method, providerRef };
    }
  }

  async verifyCallback(payload: Record<string, unknown>) {
    const env = getEnv();
    const p = payload as Record<string, string>;
    const rawSignature = `accessKey=${env.MOMO_ACCESS_KEY}&amount=${p.amount}&extraData=${p.extraData ?? ''}&message=${p.message}&orderId=${p.orderId}&orderInfo=${p.orderInfo}&orderType=${p.orderType}&partnerCode=${p.partnerCode}&payType=${p.payType}&requestId=${p.requestId}&responseTime=${p.responseTime}&resultCode=${p.resultCode}&transId=${p.transId}`;
    const expected = createHmac('sha256', env.MOMO_SECRET_KEY ?? '').update(rawSignature).digest('hex');
    const a = Buffer.from(expected);
    const b = Buffer.from(String(p.signature ?? ''));
    if (a.length !== b.length || !timingSafeEqual(a, b)) throw new Error('INVALID_MOMO_SIGNATURE');

    return {
      providerTxnId: String(p.transId ?? p.requestId),
      success: p.resultCode === '0',
      amountVnd: Number(p.amount ?? 0),
      providerRef: String(p.orderId ?? ''),
      raw: payload,
    };
  }
}
