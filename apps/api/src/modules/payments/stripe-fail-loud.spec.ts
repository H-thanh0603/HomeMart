/**
 * Stripe provider — fail-loud policy (P0 fix).
 * Trước: createPayment catch mọi lỗi và trả mock providerRef "như thành công"
 * → đơn treo PENDING, lệch đối soát, không trace. verifyCallback cũng normalize
 * payload ngay cả khi không có STRIPE_WEBHOOK_SECRET.
 *
 * Sau: lỗi mạng/HTTP → throw BadGatewayException (order giữ PENDING,
 * khách thấy lỗi retry được, expire-cron giải phóng kho).
 */

process.env.NODE_ENV ||= 'test';
process.env.DATABASE_URL ||= 'postgresql://homemart:homemart_secret@localhost:54329/homemart';
process.env.JWT_ACCESS_SECRET ||= 'x'.repeat(32);
process.env.JWT_REFRESH_SECRET ||= 'y'.repeat(32);

// getEnv() caches per process — these tests exercise the LIVE key config,
// so set them before importing the provider.
const HAD_KEY = process.env.STRIPE_SECRET_KEY;
const HAD_WEBHOOK = process.env.STRIPE_WEBHOOK_SECRET;


const INPUT = {
  orderNumber: 'HM-20260101-000001',
  amountVnd: 500000,
  orderInfo: 'Thanh toan don hang',
};

describe('StripeProvider — fail-loud (P0)', () => {
  afterEach(() => {
    // restore caller's env between tests
    if (HAD_KEY === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = HAD_KEY;
    if (HAD_WEBHOOK === undefined) delete process.env.STRIPE_WEBHOOK_SECRET;
    else process.env.STRIPE_WEBHOOK_SECRET = HAD_WEBHOOK;
  });

  it('dev: không có key → trả sandbox stub rõ ràng (không giả lập thành công)', async () => {
    delete process.env.STRIPE_SECRET_KEY;
    // NOTE: getEnv() đã cache env từ lần import đầu — provider đọc getEnv()
    // nên cần reset cache bằng jest.resetModules + dynamic import
    jest.resetModules();
    const { StripeProvider: Fresh } = await import('./providers/stripe.provider');
    const provider = new Fresh();
    const result = await provider.createPayment(INPUT);
    expect(result.providerRef).toContain('sandbox'); // đánh dấu sandbox rõ ràng
    expect(result.redirectUrl).toBeUndefined();      // không có gì để redirect
    expect(result.instructions).toContain('sandbox'); // nói rõ chưa cấu hình
  });

  it('network fail → THROW, không trả mock ref "thành công"', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_fake_key_for_network_fail';
    jest.resetModules();
    const { StripeProvider: Fresh } = await import('./providers/stripe.provider');
    const provider = new Fresh();
    // fetch sẽ thất bại vì sk_test_fake + không network → phải throw
    await expect(provider.createPayment(INPUT)).rejects.toThrow(/Stripe/);
  });

  it('verifyCallback REFUSES khi thiếu STRIPE_WEBHOOK_SECRET', async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
    jest.resetModules();
    const { StripeProvider: Fresh } = await import('./providers/stripe.provider');
    const provider = new Fresh();
    await expect(
      provider.verifyCallback({ type: 'payment_intent.succeeded', data: { object: { id: 'pi_123', amount: 500000 } } }),
    ).rejects.toThrow('STRIPE_WEBHOOK_SECRET not configured');
  });

  it('verifyCallback normalize đúng event succeeded khi ĐÃ cấu hình secret', async () => {
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret_0123456789abcdef';
    jest.resetModules();
    const { StripeProvider: Fresh } = await import('./providers/stripe.provider');
    const provider = new Fresh();
    const normalized = await provider.verifyCallback({
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_123', amount_received: 500000, metadata: { orderNumber: 'HM-20260101-000001' } } },
    });
    expect(normalized.success).toBe(true);
    expect(normalized.providerRef).toBe('pi_123');
    expect(normalized.amountVnd).toBe(500000);
    expect(normalized.orderNumber).toBe('HM-20260101-000001');
  });
});
