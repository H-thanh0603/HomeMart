import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { API_PREFIX, createTestApp } from './helpers';

describe('Health (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health → ok, db up', async () => {
    const res = await request(app.getHttpServer()).get(`${API_PREFIX}/health`).expect(200);
    expect(res.body).toMatchObject({ success: true });
    expect(res.body.data.status).toBe('ok');
    expect(res.body.data.services.db).toBe('up');
  });
});
