import { Injectable } from '@nestjs/common';
import { ThrottlerStorage, ThrottlerStorageService } from '@nestjs/throttler';
import type { ThrottlerStorageRecord } from '@nestjs/throttler/dist/throttler-storage-record.interface';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { RedisService } from './redis.service';

/**
 * Rate-limit storage that survives a Redis outage: requests are counted in
 * Redis when available (limits shared across restarts/replicas) and fall back
 * to per-process memory when Redis is down — degraded but never broken.
 */
@Injectable()
export class ResilientThrottlerStorage implements ThrottlerStorage {
  private readonly redisStorage: ThrottlerStorageRedisService;
  private readonly memoryStorage = new ThrottlerStorageService();

  constructor(private readonly redis: RedisService) {
    this.redisStorage = new ThrottlerStorageRedisService(redis.client);
  }

  increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    if (this.redis.client.status === 'ready') {
      return this.redisStorage.increment(key, ttl, limit, blockDuration, throttlerName);
    }
    return this.memoryStorage.increment(key, ttl, limit, blockDuration, throttlerName);
  }
}
