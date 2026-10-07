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
 * degraded to per-process in-memory buckets (N replicas ⇒ N×limit) instead of
 * failing wide open — auth brute-force must stay throttled during an outage.
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
  /** Per-process fallback buckets for when Redis is unavailable — per-replica
   * approximation so a Redis outage degrades to N×limit (N replicas) instead
   * of no limiting at all. */
  private readonly memoryBuckets = new Map<string, { count: number; expiresAt: number }>();
  private lastSweep = 0;

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
      // Degraded: Redis is down — fall back to in-process counters rather than
      // leaving the perimeter wide open (auth brute-force is the main threat).
      this.alerts.alertThrottled('rate-limit-redis-down', 'Redis unavailable — rate limiting degraded to in-memory per-replica buckets');
      return this.memoryHit(key, limit, ttl);
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
      // Redis hiccup mid-request: same in-memory fallback instead of a silent
      // pass-through.
      this.alerts.alertThrottled('rate-limit-error', `Rate-limit backend error — degraded to in-memory: ${(e as Error).message}`);
      return this.memoryHit(key, limit, ttl);
    }
  }

  /** Sliding-expiry fixed-window counter. Sweeps expired entries once a minute
   * so the map can't grow unbounded under bucket-flooding. */
  private memoryHit(key: string, limit: number, ttlSeconds: number): boolean {
    const now = Date.now();
    if (now - this.lastSweep > 60_000) {
      this.lastSweep = now;
      for (const [k, v] of this.memoryBuckets) {
        if (v.expiresAt <= now) this.memoryBuckets.delete(k);
      }
    }
    const entry = this.memoryBuckets.get(key);
    if (!entry || entry.expiresAt <= now) {
      this.memoryBuckets.set(key, { count: 1, expiresAt: now + ttlSeconds * 1000 });
      return true;
    }
    entry.count += 1;
    if (entry.count > limit) {
      throw new HttpException('Too many requests', HttpStatus.TOO_MANY_REQUESTS);
    }
    return true;
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