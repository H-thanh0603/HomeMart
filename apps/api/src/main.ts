import './config/env-loader';
import 'reflect-metadata';
import { LogLevel, Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { getEnv } from './config/env';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const env = getEnv();

  // Sentry — optional, init before NestFactory so all errors are captured
  if (env.SENTRY_DSN) {
    try {
      // @ts-ignore — optional dep, installed only when SENTRY_DSN is used
      const Sentry = await import('@sentry/node');
      (Sentry as { init: (o: unknown) => void }).init({ dsn: env.SENTRY_DSN, tracesSampleRate: 0.1, environment: env.NODE_ENV });
      Logger.log('Sentry initialized', 'Bootstrap');
    } catch {
      Logger.warn('SENTRY_DSN set but @sentry/node not installed — skip', 'Bootstrap');
    }
  }

  const logLevels: LogLevel[] =
    env.NODE_ENV === 'production' ? ['log', 'warn', 'error'] : ['log', 'debug', 'verbose', 'warn', 'error'];
  // rawBody: required for Stripe webhook signature verification
  const app = await NestFactory.create(AppModule, { logger: logLevels, rawBody: true });

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
    Logger.log(`📚 Swagger at http://localhost:${env.API_PORT}/api/docs`, 'Bootstrap');
  }

  await app.listen(env.API_PORT);
  Logger.log(`🚀 HomeMart API ready at http://localhost:${env.API_PORT}/api/v1`, 'Bootstrap');
}

bootstrap().catch((e) => {
  // eslint-disable-next-line no-console
  console.error('Fatal bootstrap error:', e);
  process.exit(1);
});
