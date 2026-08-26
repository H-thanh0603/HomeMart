import { createHmac } from 'crypto';
import { VnpayProvider } from './providers/vnpay.provider';
import { MomoProvider } from './providers/momo.provider';

process.env.NODE_ENV ||= 'test';
process.env.DATABASE_URL ||= 'postgresql://homemart:homemart_secret@localhost:54329/homemart';
process.env.JWT_ACCESS_SECRET ||= 'x'.repeat(32);
process.env.JWT_REFRESH_SECRET ||= 'y'.repeat(32);
process.env.VNPAY_TMN_CODE ||= 'TESTCODE';
process.env.VNPAY_HASH_SECRET ||= 'test-secret-vnpay-0123456789abcdef';
process.env.MOMO_ACCESS_KEY = 'test-access';
process.env.MOMO_SECRET_KEY = 'test-secret-momo-0123456789abcdef';

describe('Payment providers (BR-4 signature verification)', () => {
  const vnpay = new VnpayProvider();
  const momo = new MomoProvider();

  describe('VNPay', () => {
    it('creates payment with amount × 100 and signed URL', async () => {
      const result = await vnpay.createPayment({
        orderNumber: 'HM-20260101-000001',
        amountVnd: 500000,
        orderInfo: 'Thanh toan',
      });
      expect(result.redirectUrl).toContain('vnp_Amount=50000000');
      expect(result.providerRef).toContain('HM-20260101-000001');
    });

    it('accepts a correctly-signed callback', async () => {
      const payload = {
        vnp_TmnCode: 'TEST',
        vnp_Amount: '50000000',
        vnp_ResponseCode: '00',
        vnp_TxnRef: 'HM-20260101-000001-1234',
      };
      const sorted = Object.keys(payload).sort()
        .map((k) => `${k}=${encodeURIComponent(payload[k as keyof typeof payload])}`)
        .join('&');
      const hash = createHmac('sha512', process.env.VNPAY_HASH_SECRET ?? 'dev-vnpay-secret').update(sorted).digest('hex');

      const verified = await vnpay.verifyCallback({ ...payload, vnp_SecureHash: hash });
      expect(verified.success).toBe(true);
      expect(verified.amountVnd).toBe(500000);
      expect(verified.providerRef).toBe('HM-20260101-000001-1234'); // full ref preserved (no lossy parsing)
    });

    it('REJECTS tampered callbacks', async () => {
      const payload = {
        vnp_TxnRef: 'HM-20260101-000001-1234',
        vnp_Amount: '999999999', // attacker changed the amount
        vnp_ResponseCode: '00',
        vnp_SecureHash: 'deadbeef'.repeat(16),
      };
      await expect(vnpay.verifyCallback(payload)).rejects.toThrow('INVALID_VNPAY_SIGNATURE');
    });
  });

  describe('MoMo', () => {
    it('rejects invalid signatures', async () => {
      await expect(
        momo.verifyCallback({
          partnerCode: 'X', orderId: 'HM-X-1', requestId: 'r1',
          amount: '100000', transId: 't1', resultCode: '0',
          message: 'Success', orderInfo: 'i', orderType: 'momo_wallet',
          payType: 'webApp', responseTime: '123', extraData: '',
          signature: 'invalid-signature',
        }),
      ).rejects.toThrow('INVALID_MOMO_SIGNATURE');
    });
  });
});
