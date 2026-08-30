import * as Sentry from '@sentry/nestjs';
import type { Env } from '../../config/env';

/**
 * Initialize Sentry error tracking. No-op without SENTRY_DSN.
 * Client errors (4xx) are dropped — they're user noise, not bugs to page on.
 */
export function SentryInit(env: Env): void {
  if (!env.SENTRY_DSN) return;

  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    tracesSampleRate: 0.1,
    beforeSend(event) {
      const status = event.exception?.values?.[0]?.value ?? '';
      // Nest's AllExceptionsFilter message includes the HTTP status for 4xx
      if (/\b(4\d\d)\b/.test(status) && !/\b(5\d\d)\b/.test(status)) return null;
      return event;
    },
  });
}
