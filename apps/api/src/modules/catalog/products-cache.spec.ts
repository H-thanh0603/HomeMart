/**
 * Unit tests for catalog cache-aside (ProductsService.cached).
 * Redis is stubbed in-memory — no real Redis/DB needed.
 */
import { NotFoundException } from '@nestjs/common';
import { ProductsService } from './products.service';
import { PrismaService } from '../../infra/prisma.service';
import { RedisService } from '../../infra/redis.service';

class RedisStub {
  private store = new Map<string, string>();
  get = jest.fn(async (k: string) => this.store.get(k) ?? null);
  set = jest.fn(async (k: string, v: string, _ttl?: number) => void this.store.set(k, v));
  del = jest.fn(async (k: string) => void this.store.delete(k));
  bump = jest.fn(async (k: string) => {
    const next = Number(this.store.get(k) ?? '0') + 1;
    this.store.set(k, String(next));
    return next;
  });
  tryLock = jest.fn(async (k: string) => {
    if (this.store.has(k)) return false;
    this.store.set(k, '1');
    return true;
  });
  unlock = jest.fn(async (k: string) => void this.store.delete(k));
  sleep = jest.fn(async () => undefined);
}

describe('ProductsService catalog cache', () => {
  let svc: ProductsService;
  let redis: RedisStub;
  let loadCount: number;

  const load = jest.fn(async () => {
    loadCount++;
    return { items: [{ id: `p${loadCount}` }], total: 1, page: 1, limit: 20 };
  });

  beforeEach(() => {
    loadCount = 0;
    load.mockClear();
    redis = new RedisStub();
    svc = new ProductsService({} as PrismaService, redis as unknown as RedisService);
  });

  it('second identical read hits cache — loader runs once', async () => {
    // access private method through public contract: use (svc as any) to test the seam directly
    const read = () => (svc as unknown as { cached: <T>(s: string, k: string, t: number, l: () => Promise<T>) => Promise<T> })
      .cached('list', 'q1', 30, load);
    const a = await read();
    const b = await read();
    expect(b).toEqual(a);
    expect(loadCount).toBe(1);
    expect(redis.set).toHaveBeenCalledTimes(1);
  });

  it('different query keys miss cache', async () => {
    const read = (k: string) => (svc as unknown as { cached: <T>(s: string, k: string, t: number, l: () => Promise<T>) => Promise<T> })
      .cached('list', k, 30, load);
    await read('q1');
    await read('q2');
    expect(loadCount).toBe(2);
  });

  it('version bump invalidates previous cache entries', async () => {
    const read = () => (svc as unknown as { cached: <T>(s: string, k: string, t: number, l: () => Promise<T>) => Promise<T> })
      .cached('list', 'q1', 30, load);
    await read();
    await redis.bump('catalog:version');
    await read();
    expect(loadCount).toBe(2); // reloaded after bump
  });

  it('corrupt cache entry falls through to loader', async () => {
    await redis.set('list:0:q1', '{not-json', 30);
    const result = await (svc as unknown as { cached: <T>(s: string, k: string, t: number, l: () => Promise<T>) => Promise<T> })
      .cached('list', 'q1', 30, load);
    expect(loadCount).toBe(1); // corrupt entry did not short-circuit
    expect(result).toEqual({ items: [{ id: 'p1' }], total: 1, page: 1, limit: 20 });
  });

  it('stampede: lock held by another caller → waiter reads cache, does not load', async () => {
    // Another caller holds the load lock and has just populated the cache
    await redis.set('lock:list:0:q1', '1');
    await redis.set('list:0:q1', JSON.stringify({ items: [], total: 0, page: 1, limit: 20 }));
    const result = await (svc as unknown as { cached: <T>(s: string, k: string, t: number, l: () => Promise<T>) => Promise<T> })
      .cached('list', 'q1', 30, load);
    expect(loadCount).toBe(0);
    expect(result).toEqual({ items: [], total: 0, page: 1, limit: 20 });
  });

  it('negative cache: NotFound is stored as a marker, loader runs once', async () => {
    const fail = jest.fn(async () => {
      loadCount++;
      throw new NotFoundException('Product not found');
    });
    const call = () => (svc as unknown as { cached: <T>(s: string, k: string, t: number, l: () => Promise<T>) => Promise<T> })
      .cached('detail', 'slug:missing', 60, fail);
    await expect(call()).rejects.toThrow(NotFoundException);
    await expect(call()).rejects.toThrow(NotFoundException);
    expect(loadCount).toBe(1); // second request served from the NULL marker
  });
});
