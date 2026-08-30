import './config/env-loader';
import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import { SentryInit } from './common/observability/sentry.init';
import helmet from 'helmet';
import { getEnv } from './config/env';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const env = getEnv();

  // Sentry — init before NestFactory so all errors are captured.
  // 4xx client errors are noise, only 5xx/unhandled are reported.
  SentryInit(env);

  // Raw JSON logs (pino). Buffer until logger module is ready.
  const app = await NestFactory.create(AppModule, { bufferLogs: true, rawBody: true });
  app.useLogger(app.get(Logger));

  // Refresh token travels in an httpOnly cookie (see auth.controller.ts)
  app.use(cookieParser());

  // Security headers
  app.use(
    helmet({
      contentSecurityPolicy: env.NODE_ENV === 'production' ? undefined : false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // Serve uploaded files from UPLOAD_DIR (for local storage driver)
  if (env.STORAGE_DRIVER === 'local') {
    const express = await import('express');
    app.use('/uploads', express.default.static(env.UPLOAD_DIR, { maxAge: '7d', index: false }));
  }

  app.enableCors({
    origin: [env.WEB_URL],
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
  });

  // Behind nginx/reverse proxy: trust exactly one hop so req.ip is the real
  // client IP — without this, ThrottlerGuard rate-limits everyone as one bucket.
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  app.setGlobalPrefix('api/v1');
  app.enableShutdownHooks();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  if (env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('HomeMart API')
      .setDescription('E-commerce đồ gia dụng — REST API v1')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config));
    app.get(Logger).log(`📚 Swagger at http://localhost:${env.API_PORT}/api/docs`);
  }

  await app.listen(env.API_PORT);
  app.get(Logger).log(`🚀 HomeMart API ready at http://localhost:${env.API_PORT}/api/v1`);
}

bootstrap().catch((e) => {
  // eslint-disable-next-line no-console
  console.error('Fatal bootstrap error:', e);
  process.exit(1);
});
