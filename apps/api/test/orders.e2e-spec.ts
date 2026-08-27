import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  API_PREFIX,
  auth,
  createTestApp,
  defaultAddressId,
  firstProduct,
  login,
  standardShippingMethodId,
} from './helpers';

const CUSTOMER = { email: 'customer@homemart.vn', password: 'Customer@123' };

describe('Cart → Checkout → Order (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;

  beforeAll(async () => {
    app = await createTestApp();
    const tokens = await login(app, CUSTOMER.email, CUSTOMER.password);
    accessToken = tokens.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('thêm vào giỏ → xem giỏ có item', async () => {
    const product = await firstProduct(app);

    const add = await request(app.getHttpServer())
      .post(`${API_PREFIX}/cart/items`)
      .set(auth(accessToken))
      .send({ productId: product.id, quantity: 2 })
      .expect(201);

    expect(add.body.success).toBe(true);

    const cart = await request(app.getHttpServer())
      .get(`${API_PREFIX}/cart`)
      .set(auth(accessToken))
      .expect(200);
    const items = cart.body.data.items ?? [];
    expect(items.some((i: { productId: string }) => i.productId === product.id)).toBe(true);
  });

  it('preview tính subtotal/tax/total phía backend', async () => {
    const product = await firstProduct(app);
    const shippingMethodId = await standardShippingMethodId(app);

    const res = await request(app.getHttpServer())
      .post(`${API_PREFIX}/orders/preview`)
      .set(auth(accessToken))
      .send({ items: [{ productId: product.id, quantity: 2 }], shippingMethodId })
      .expect(201);

    const quote = res.body.data;
    expect(quote.subtotalAmount).toBeGreaterThan(0);
    expect(quote.totalAmount).toBeGreaterThanOrEqual(quote.subtotalAmount);
  });

  it('checkout COD → order PENDING → chi tiết khớp → cancel thành công', async () => {
    const product = await firstProduct(app);
    const addressId = await defaultAddressId(app, accessToken);
    const shippingMethodId = await standardShippingMethodId(app);

    // Đảm bảo giỏ có đúng 1 dòng để đối soát
    await request(app.getHttpServer())
      .post(`${API_PREFIX}/cart/items`)
      .set(auth(accessToken))
      .send({ productId: product.id, quantity: 1 })
      .expect(201);

    const cartRes = await request(app.getHttpServer())
      .get(`${API_PREFIX}/cart`)
      .set(auth(accessToken))
      .expect(200);
    const cartItems: Array<{ id: string; productId: string }> = cartRes.body.data.items ?? [];
    for (const item of cartItems.filter((i) => i.productId !== product.id)) {
      await request(app.getHttpServer())
        .delete(`${API_PREFIX}/cart/items/${item.id}`)
        .set(auth(accessToken))
        .expect(200);
    }

    const checkout = await request(app.getHttpServer())
      .post(`${API_PREFIX}/orders/checkout`)
      .set(auth(accessToken))
      .send({ addressId, shippingMethodId, paymentMethod: 'COD' })
      .expect(201);

    const order = checkout.body.data;
    expect(order.orderNumber).toBeTruthy();
    expect(order.status).toBe('PENDING');
    expect(order.items.length).toBeGreaterThan(0);
    expect(order.payments[0].method).toBe('COD');

    const detail = await request(app.getHttpServer())
      .get(`${API_PREFIX}/orders/${order.id}`)
      .set(auth(accessToken))
      .expect(200);
    expect(detail.body.data.orderNumber).toBe(order.orderNumber);
    expect(detail.body.data.totalAmount).toBe(order.totalAmount);

    // Đơn của user khác không thấy — admin list phải qua RBAC (403 đã test ở auth)
    const noAuth = await request(app.getHttpServer()).get(`${API_PREFIX}/orders/${order.id}`);
    expect([401, 403]).toContain(noAuth.status);

    const cancelled = await request(app.getHttpServer())
      .post(`${API_PREFIX}/orders/${order.id}/cancel`)
      .set(auth(accessToken))
      .send({ reason: 'E2E test cancel' })
      .expect(201);
    expect(cancelled.body.data.status).toBe('CANCELLED');
  });

  it('checkout thiếu addressId → 400 validation', async () => {
    const shippingMethodId = await standardShippingMethodId(app);
    await request(app.getHttpServer())
      .post(`${API_PREFIX}/orders/checkout`)
      .set(auth(accessToken))
      .send({ shippingMethodId, paymentMethod: 'COD' })
      .expect(400);
  });

  it('guest qua X-Guest-Token → tạo giỏ, thêm item, xem giỏ độc lập với user', async () => {
    const guestToken = `guest-e2e-${Date.now()}`;
    const product = await firstProduct(app);

    await request(app.getHttpServer())
      .post(`${API_PREFIX}/cart/items`)
      .set('X-Guest-Token', guestToken)
      .send({ productId: product.id, quantity: 1 })
      .expect(201);

    const res = await request(app.getHttpServer())
      .get(`${API_PREFIX}/cart`)
      .set('X-Guest-Token', guestToken)
      .expect(200);
    expect(res.body.data.items.some((i: { productId: string }) => i.productId === product.id)).toBe(
      true,
    );

    // Guest không danh tính nào (không token, không guest-token) → 403
    const noIdentity = await request(app.getHttpServer()).get(`${API_PREFIX}/cart`);
    expect([401, 403]).toContain(noIdentity.status);

    // Giỏ user không bị ảnh hưởng bởi giỏ guest
    const userCart = await request(app.getHttpServer())
      .get(`${API_PREFIX}/cart`)
      .set(auth(accessToken))
      .expect(200);
    expect(userCart.body.data.guestToken).toBeNull();
  });
});
