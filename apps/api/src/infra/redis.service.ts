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

  async onModuleDestroy() {
    await this.client.quit().catch(() => undefined);
  }
}
