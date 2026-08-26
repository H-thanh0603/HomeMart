import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { API_PREFIX, auth, createTestApp, login } from './helpers';

const CUSTOMER = { email: 'customer@homemart.vn', password: 'Customer@123' };

describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('login với sai mật khẩu → 401', async () => {
    await request(app.getHttpServer())
      .post(`${API_PREFIX}/auth/login`)
      .send({ email: CUSTOMER.email, password: 'wrong-password' })
      .expect(401);
  });

  it('login đúng → accessToken + refreshToken + user', async () => {
    const res = await request(app.getHttpServer())
      .post(`${API_PREFIX}/auth/login`)
      .send(CUSTOMER)
      .expect(201);
    expect(res.body.data.user.email).toBe(CUSTOMER.email);
    expect(typeof res.body.data.accessToken).toBe('string');
    expect(typeof res.body.data.refreshToken).toBe('string');
  });

  it('GET /auth/me với token hợp lệ → user hiện tại; không token → 401', async () => {
    const tokens = await login(app, CUSTOMER.email, CUSTOMER.password);

    const me = await request(app.getHttpServer())
      .get(`${API_PREFIX}/auth/me`)
      .set(auth(tokens.accessToken))
      .expect(200);
    expect(me.body.data.email).toBe(CUSTOMER.email);

    await request(app.getHttpServer()).get(`${API_PREFIX}/auth/me`).expect(401);
  });

  it('refresh rotation: token cũ dùng lại → 401 (revoke cả chain)', async () => {
    const tokens = await login(app, CUSTOMER.email, CUSTOMER.password);

    const rotated = await request(app.getHttpServer())
      .post(`${API_PREFIX}/auth/refresh`)
      .send({ refreshToken: tokens.refreshToken })
      .expect(201);
    expect(typeof rotated.body.data.refreshToken).toBe('string');

    // Reuse old refresh token → toàn bộ session bị thu hồi
    await request(app.getHttpServer())
      .post(`${API_PREFIX}/auth/refresh`)
      .send({ refreshToken: tokens.refreshToken })
      .expect(401);

    // Token mới cũng đã bị revoke theo chain
    await request(app.getHttpServer())
      .post(`${API_PREFIX}/auth/refresh`)
      .send({ refreshToken: rotated.body.data.refreshToken })
      .expect(401);
  });

  it('register email trùng → 409', async () => {
    await request(app.getHttpServer())
      .post(`${API_PREFIX}/auth/register`)
      .send({ email: CUSTOMER.email, password: 'Abcd@1234', fullName: 'Trùng Email' })
      .expect(409);
  });

  it('RBAC: customer gọi admin API → 403', async () => {
    const tokens = await login(app, CUSTOMER.email, CUSTOMER.password);
    await request(app.getHttpServer())
      .get(`${API_PREFIX}/admin/orders`)
      .set(auth(tokens.accessToken))
      .expect(403);
  });
});
