import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

export const API_PREFIX = '/api/v1';

export interface LoginTokens {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; role: string };
}

export async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication({ logger: ['error', 'warn'] });
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );
  await app.init();
  return app;
}

export async function login(
  app: INestApplication,
  email: string,
  password: string,
): Promise<LoginTokens> {
  const res = await request(app.getHttpServer())
    .post(`${API_PREFIX}/auth/login`)
    .send({ email, password })
    .expect(201);
  expect(res.body.data).toHaveProperty('accessToken');
  return res.body.data;
}

export function auth(accessToken: string) {
  return { Authorization: `Bearer ${accessToken}` };
}

export async function firstProduct(app: INestApplication) {
  const res = await request(app.getHttpServer())
    .get(`${API_PREFIX}/products?page=1&limit=5`)
    .expect(200);
  expect(res.body.data.items.length).toBeGreaterThan(0);
  return res.body.data.items[0];
}

export async function defaultAddressId(app: INestApplication, accessToken: string): Promise<string> {
  const res = await request(app.getHttpServer())
    .get(`${API_PREFIX}/users/me/addresses`)
    .set(auth(accessToken))
    .expect(200);
  const addresses = Array.isArray(res.body.data) ? res.body.data : res.body.data.addresses;
  expect(addresses.length).toBeGreaterThan(0);
  const preferred = addresses.find((a: { isDefault: boolean }) => a.isDefault) ?? addresses[0];
  return preferred.id;
}

export async function standardShippingMethodId(app: INestApplication): Promise<string> {
  const res = await request(app.getHttpServer()).get(`${API_PREFIX}/shipping/methods`).expect(200);
  const methods = Array.isArray(res.body.data) ? res.body.data : res.body.data.methods;
  expect(methods.length).toBeGreaterThan(0);
  const standard = methods.find((m: { code: string }) => m.code === 'STANDARD') ?? methods[0];
  return standard.id;
}
