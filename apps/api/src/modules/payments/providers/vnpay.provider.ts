import { Injectable } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import { getEnv } from '../../../config/env';
import { PaymentProvider, CreatePaymentInput, CreatePaymentResult } from '../payment-provider.interface';

/**
 * VNPay integration (sandbox-compatible).
 * Signature: HMAC-SHA512 over sorted query params with VNPAY_HASH_SECRET.
 */
@Injectable()
export class VnpayProvider implements PaymentProvider {
  readonly method = 'VNPAY' as const;

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const env = getEnv();
    const providerRef = `${input.orderNumber}-${Date.now()}`;
    const date = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const createDate = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;

    const params: Record<string, string> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: env.VNPAY_TMN_CODE ?? '',
      vnp_Amount: String(input.amountVnd * 100), // VNPAY uses cents-like x100
      vnp_CreateDate: createDate,
      vnp_CurrCode: 'VND',
      vnp_IpAddr: input.clientIp ?? '127.0.0.1',
      vnp_Locale: 'vn',
      vnp_OrderInfo: input.orderInfo,
      vnp_OrderType: 'other',
      vnp_ReturnUrl: env.VNPAY_RETURN_URL,
      vnp_TxnRef: providerRef,
    };

    const signed = this.signParams(params, env.VNPAY_HASH_SECRET ?? '');
    const query = new URLSearchParams(signed).toString();
    return { method: this.method, redirectUrl: `${env.VNPAY_URL}?${query}`, providerRef };
  }

  async verifyCallback(payload: Record<string, unknown>) {
    const env = getEnv();
    const data = { ...payload } as Record<string, string>;
    const receivedHash = data['vnp_SecureHash'];
    delete data['vnp_SecureHash'];
    delete data['vnp_SecureHashType'];

    const expected = createHmac('sha512', env.VNPAY_HASH_SECRET ?? '')
      .update(this.queryString(data))
      .digest('hex');

    const a = Buffer.from(expected);
    const b = Buffer.from(String(receivedHash ?? ''));
    if (a.length !== b.length || !timingSafeEqual(a, b)) throw new Error('INVALID_VNPAY_SIGNATURE');

    return {
      providerTxnId: String(data.vnp_TxnRef ?? ''),
      success: data.vnp_ResponseCode === '00',
      amountVnd: Number(data.vnp_Amount ?? 0) / 100,
      providerRef: String(data.vnp_TxnRef ?? ''),
      raw: payload,
    };
  }

  private queryString(params: Record<string, string>): string {
    return Object.keys(params)
      .sort()
      .filter((k) => params[k] !== undefined && params[k] !== '')
      .map((k) => `${k}=${encodeURIComponent(params[k]).replace(/%20/g, '+')}`)
      .join('&');
  }

  async refund(providerRef: string, amountVnd: number, orderNumber: string) {
    const env = getEnv();
    if (!env.VNPAY_HASH_SECRET || env.VNPAY_HASH_SECRET.startsWith('dev-')) {
      throw new Error('VNPay refund requires production VNPAY_HASH_SECRET + VNPAY_TMN_CODE');
    }
    const date = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const createDate = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
    const params: Record<string, string> = {
      vnp_RequestId: `${Date.now()}`,
      vnp_Version: '2.1.0',
      vnp_Command: 'refund',
      vnp_TmnCode: env.VNPAY_TMN_CODE ?? '',
      vnp_TransactionType: '02', // 02 = refund toàn phần
      vnp_TxnRef: providerRef,
      vnp_Amount: String(amountVnd * 100),
      vnp_OrderInfo: `Refund ${orderNumber}`,
      vnp_TransactionDate: createDate,
      vnp_CreateBy: 'HomeMart',
      vnp_CreateDate: createDate,
      vnp_IpAddr: '127.0.0.1',
    };
    const signed = this.signParams(params, env.VNPAY_HASH_SECRET ?? '');
    const res = await fetch('https://sandbox.vnpayment.vn/merchant_webapi/api/transaction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(signed),
      signal: AbortSignal.timeout(15000),
    });
    const data = (await res.json()) as { vnp_ResponseCode?: string; vnp_Message?: string };
    if (data.vnp_ResponseCode !== '00') throw new Error(`VNPay refund failed: ${data.vnp_ResponseCode} ${data.vnp_Message ?? ''}`);
    return { gatewayRef: providerRef, raw: data };
  }

  private signParams(params: Record<string, string>, secret: string): Record<string, string> {
    const sorted = Object.keys(params)
      .filter((k) => params[k] !== undefined && params[k] !== '')
      .sort()
      .reduce((acc, k) => ({ ...acc, [k]: params[k] }), {} as Record<string, string>);
    if (!secret) return sorted;
    const hmac = createHmac('sha512', secret).update(this.queryString(sorted)).digest('hex');
    return { ...sorted, vnp_SecureHash: hmac };
  }
}
