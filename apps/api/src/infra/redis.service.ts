import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { getEnv } from '../config/env';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  public readonly client: Redis;

  constructor() {
    this.client = new Redis(getEnv().REDIS_URL, {
      maxRetriesPerRequest: 2,
      lazyConnect: true,
    });
    this.client.on('error', (e) => this.logger.warn(`Redis error: ${e.message}`));
    this.client.connect().catch(() => this.logger.warn('Redis unavailable — running degraded (no cache/rate-limit)'));
  }

  async get(key: string): Promise<string | null> {
    if (this.client.status !== 'ready') return null;
    return this.client.get(key).catch(() => null);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (this.client.status !== 'ready') return;
    if (ttlSeconds) {
      await this.client.set(key, value, 'EX', ttlSeconds).catch(() => undefined);
    } else {
      await this.client.set(key, value).catch(() => undefined);
    }
  }

  async del(key: string): Promise<void> {
    if (this.client.status !== 'ready') return;
    await this.client.del(key).catch(() => undefined);
  }

  /** Bump a version key; returns the new value. Used to namespace caches. */
  async bump(key: string): Promise<number> {
    if (this.client.status !== 'ready') return 0;
    const v = await this.client.incr(key).catch(() => null);
    return v ?? 0;
  }

  /**
   * Singleflight lock for cache stampede protection. Returns true when THIS
   * caller won the right to reload the value; losers should wait and re-read.
   * Redis down → true (degraded pass-through, no locking).
   */
  async tryLock(key: string, ttlMs: number): Promise<boolean> {
    if (this.client.status !== 'ready') return true;
    const ok = await this.client.set(key, '1', 'PX', ttlMs, 'NX').catch(() => null);
    if (ok === null) return true;
    return ok === 'OK';
  }

  async unlock(key: string): Promise<void> {
    if (this.client.status !== 'ready') return;
    await this.client.del(key).catch(() => undefined);
  }

  /** Sleep helper for lock waiters. */
  sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async onModuleDestroy() {
    await this.client.quit().catch(() => undefined);
  }
}
