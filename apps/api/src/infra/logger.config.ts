import type { Params } from 'nestjs-pino';
import { getEnv } from '../config/env';

/**
 * Structured JSON logging (pino).
 * Redacted: tokens/credentials never reach disk in plaintext.
 */
export function buildPinoConfig(): Params {
  const env = getEnv();
  return {
    pinoHttp: {
      level: env.NODE_ENV === 'production' ? 'info' : 'debug',
      redact: {
        paths: [
          'req.headers.authorization',
          'req.headers.cookie',
          'req.body.password',
          'req.body.passwordHash',
          'req.body.currentPassword',
          'req.body.newPassword',
          'req.body.token',
          'req.body.refreshToken',
          '*.password',
          '*.passwordHash',
        ],
        censor: '[REDACTED]',
      },
      autoLogging: {
        ignore: (req) => req.url === '/health' || req.url === '/api/v1/health',
      },
      transport:
        env.NODE_ENV === 'production'
          ? undefined // raw JSON to stdout — ship to log aggregator
          : { target: 'pino-pretty', options: { singleLine: true } },
    },
  };
}
