import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { API_PREFIX, createTestApp, firstProduct } from './helpers';

describe('Catalog (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /products (public) → danh sách phân trang', async () => {
    const res = await request(app.getHttpServer())
      .get(`${API_PREFIX}/products?page=1&limit=5`)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
    expect(res.body.data.items.length).toBeGreaterThan(0);
    expect(res.body.data.items.length).toBeLessThanOrEqual(5);
    expect(Number(res.body.meta?.total ?? res.body.data.total ?? 0)).toBeGreaterThan(0);
  });

  it('GET /products?search= → lọc theo từ khoá', async () => {
    const all = await request(app.getHttpServer())
      .get(`${API_PREFIX}/products?page=1&limit=100`)
      .expect(200);
    const someName = all.body.data.items[0].name.slice(0, 8);

    const res = await request(app.getHttpServer())
      .get(`${API_PREFIX}/products?page=1&limit=10&search=${encodeURIComponent(someName)}`)
      .expect(200);
    expect(res.body.data.items.length).toBeGreaterThan(0);
  });

  it('GET /products/:slug → chi tiết sản phẩm; slug sai → 404', async () => {
    const product = await firstProduct(app);

    const detail = await request(app.getHttpServer())
      .get(`${API_PREFIX}/products/${product.slug}`)
      .expect(200);
    expect(detail.body.data.id).toBe(product.id);

    await request(app.getHttpServer())
      .get(`${API_PREFIX}/products/khong-ton-tai-${Date.now()}`)
      .expect(404);
  });

  it('GET /shipping/methods (public) → có STANDARD', async () => {
    const res = await request(app.getHttpServer()).get(`${API_PREFIX}/shipping/methods`).expect(200);
    const methods = Array.isArray(res.body.data) ? res.body.data : res.body.data.methods;
    expect(methods.map((m: { code: string }) => m.code)).toContain('STANDARD');
  });
});
