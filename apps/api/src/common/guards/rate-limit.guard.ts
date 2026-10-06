import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RedisService } from '../../infra/redis.service';
import { AlertsService } from '../observability/alerts.service';

/**
 * Lightweight rate-limit guard — replaces @nestjs/throttler, whose 6.5 CJS
 * build is incompatible with NestJS 12 (ESM-only core: `Reflector` resolves
 * to undefined through require(), breaking DI at boot).
 *
 * Counting is INCR+EXPIRE in Redis (atomic, cross-replica). Redis down →
 * fail-open: rate limiting degrades to off rather than blocking all traffic
 * (RedisService already logs loudly when unavailable).
 *
 * Per-endpoint override via:
 *   @SetMetadata(RATE_LIMIT_KEY, { limit: 10 })   // per minute
 */
export const RATE_LIMIT_KEY = 'homemart:rate-limit';
export interface RateLimitMeta {
  limit: number;
  ttlSeconds?: number;
}

const GLOBAL_LIMIT_KEY = Symbol('RATE_LIMIT_GLOBAL');

/** Module-level factory for app.module.ts: global default limit. */
export function setGlobalRateLimit(limit: number) {
  (globalThis as Record<symbol, number>)[GLOBAL_LIMIT_KEY] = limit;
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly redis: RedisService,
    private readonly alerts: AlertsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    // Public endpoints (webhooks, health) are excluded by their own @Public
    // marker only when they also set RATE_LIMIT_KEY to 0; default: everyone counts.
    const meta = this.reflector.getAllAndOverride<RateLimitMeta | undefined>(RATE_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (meta?.limit === 0) return true;

    const globalLimit =
      (globalThis as Record<symbol, number | undefined>)[GLOBAL_LIMIT_KEY] ?? 120;
    const limit = meta?.limit ?? globalLimit;
    const ttl = meta?.ttlSeconds ?? 60;

    const ip = this.clientIp(request);
    const route = `${context.getClass().name}.${context.getHandler().name}`;
    const key = `rl:${route}:${ip}`;

    const client = this.redis.client;
    if (client.status !== 'ready') {
      // Degraded fail-open: rate limiting is OFF. Alert (throttled) so an
      // operator knows the perimeter is open during a Redis outage.
      this.alerts.alertThrottled('rate-limit-redis-down', 'Redis unavailable — rate limiting is failing open (no protection)');
      return true;
    }

    try {
      const hits = await client.incr(key);
      if (hits === 1) await client.expire(key, ttl);
      if (hits > limit) {
        throw new HttpException('Too many requests', HttpStatus.TOO_MANY_REQUESTS);
      }
      return true;
    } catch (e) {
      if (e instanceof HttpException) throw e;
      // Redis hiccup mid-request: don't block the customer, but don't pretend
      // the request was rate-limited either.
      this.alerts.alertThrottled('rate-limit-error', `Rate-limit backend error: ${(e as Error).message}`);
      return true;
    }
  }

  /**
   * Rate-limit identity is ALWAYS req.ip. req.ip is trustworthy only when the
   * proxy chain is correctly configured (main.ts: trust proxy = TRUSTED_PROXY_HOPS),
   * because Express then ignores client-supplied X-Forwarded-For entries beyond
   * the trusted hops. We deliberately do NOT read X-Forwarded-For directly: an
   * attacker could then rotate the header per request and mint an unlimited
   * number of buckets, defeating the limiter entirely.
   */
  private clientIp(request: { ip?: string; socket?: { remoteAddress?: string } }): string {
    return request.ip ?? request.socket?.remoteAddress ?? 'unknown';
  }
}