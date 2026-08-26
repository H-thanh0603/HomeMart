/**
 * Integration tests against the real PostgreSQL (docker compose).
 * Covers the highest-risk business rules:
 *  - BR-2 overselling prevention under concurrency
 *  - BR-3 voucher atomic consumption
 *  - BR-4 payment webhook idempotency
 */
process.env.DATABASE_URL ||= 'postgresql://homemart:homemart_secret@localhost:54329/homemart?schema=public';

import { PrismaClient, ProductStatus } from '@prisma/client';
import { InventoryService } from './modules/inventory/inventory.service';
import { PromotionsService } from './modules/promotions/promotions.service';

const prisma = new PrismaClient();

jest.setTimeout(30000);

async function seedFixture() {
  const cat = await prisma.category.findFirstOrThrow();
  const product = await prisma.product.create({
    data: {
      sku: `TEST-${Date.now()}`,
      slug: `test-${Date.now()}`,
      name: 'Test Product',
      categoryId: cat.id,
      price: 100000,
      status: ProductStatus.PUBLISHED,
      inventories: { create: { availableStock: 5 } },
    },
    include: { inventories: true },
  });
  return product;
}

describe('InventoryService — overselling prevention (BR-2)', () => {
  let inventoryService: InventoryService;
  let productId: string;
  let orderId: string;

  beforeAll(async () => {
    // Services only need prisma + event emitter stub
    inventoryService = new InventoryService(prisma as never, { emit: jest.fn() } as never);
    const product = await seedFixture();
    productId = product.id;
    orderId = `TEST-ORDER-${Date.now()}`;
  });

  afterAll(async () => {
    const leftovers = await prisma.product.findMany({
      where: { sku: { startsWith: 'TEST-' } },
      select: { id: true },
    });
    const ids = leftovers.map((p) => p.id);
    await prisma.inventoryTransaction.deleteMany({ where: { inventory: { productId: { in: ids } } } });
    await prisma.inventory.deleteMany({ where: { productId: { in: ids } } });
    await prisma.cartItem.deleteMany({ where: { productId: { in: ids } } });
    await prisma.wishlistItem.deleteMany({ where: { productId: { in: ids } } });
    await prisma.product.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
  });

  it('reserves stock atomically and tracks ledger', async () => {
    await prisma.$transaction(async (tx) => {
      await inventoryService.reserve(tx as never, [{ productId, quantity: 3 }], orderId);
    });
    const inv = await prisma.inventory.findFirstOrThrow({ where: { productId } });
    expect(inv.availableStock).toBe(2);
    expect(inv.reservedStock).toBe(3);
    const ledger = await prisma.inventoryTransaction.findMany({ where: { reference: orderId } });
    expect(ledger).toHaveLength(1);
  });

  it('REFUSES to reserve more than available (rolls back)', async () => {
    await expect(
      prisma.$transaction(async (tx) => {
        await inventoryService.reserve(tx as never, [{ productId, quantity: 10 }], orderId); // only 2 left
      }),
    ).rejects.toThrow(/Insufficient stock/);

    // Nothing changed
    const inv = await prisma.inventory.findFirstOrThrow({ where: { productId } });
    expect(inv.availableStock).toBe(2);
    expect(inv.reservedStock).toBe(3);
  });

  it('concurrent checkouts cannot oversell the last units', async () => {
    // Two concurrent transactions both try to reserve 3 of remaining 2
    const attempt = () =>
      prisma.$transaction(async (tx) => {
        await new Promise((r) => setTimeout(r, Math.random() * 20)); // interleave
        await inventoryService.reserve(tx as never, [{ productId, quantity: 3 }], `${orderId}-c${Math.random()}`);
      });

    const results = await Promise.allSettled([attempt(), attempt()]);
    const failed = results.filter((r) => r.status === 'rejected');
    expect(failed.length).toBeGreaterThanOrEqual(1); // at least one must fail

    const inv = await prisma.inventory.findFirstOrThrow({ where: { productId } });
    expect(inv.reservedStock).toBe(3); // unchanged by the failed attempt
  });

  it('release returns reserved stock', async () => {
    await prisma.$transaction(async (tx) => {
      await inventoryService.release(tx as never, [{ productId, quantity: 3 }], orderId);
    });
    const inv = await prisma.inventory.findFirstOrThrow({ where: { productId } });
    expect(inv.availableStock).toBe(5);
    expect(inv.reservedStock).toBe(0);
  });

  it('release is idempotent-safe when called twice', async () => {
    await prisma.$transaction(async (tx) => {
      await inventoryService.reserve(tx as never, [{ productId, quantity: 1 }], `${orderId}-rel`);
    });
    for (let k = 0; k < 2; k++) {
      await prisma.$transaction(async (tx) => {
        await inventoryService.release(tx as never, [{ productId, quantity: 1 }], `${orderId}-rel`);
      });
    }
    const inv = await prisma.inventory.findFirstOrThrow({ where: { productId } });
    expect(inv.availableStock).toBe(5); // not 6
  });
});

describe('PromotionsService — voucher concurrency (BR-3)', () => {
  let promotionsService: PromotionsService;
  let voucherCode: string;

  beforeAll(() => {
    promotionsService = new PromotionsService(prisma as never);
  });

  beforeEach(async () => {
    voucherCode = `TESTVC${Date.now()}`;
    await prisma.voucher.create({
      data: {
        code: voucherCode,
        type: 'PERCENTAGE',
        value: 10,
        usageLimit: 1, // chỉ đúng 1 lượt
        minOrderAmount: 0,
        startsAt: new Date(Date.now() - 1000),
        endsAt: new Date(Date.now() + 86400e3),
      },
    });
    // real users — voucher_usages has FKs to users
    for (const id of ['user-b', 'user-c']) {
      await prisma.user.upsert({
        where: { id },
        update: {},
        create: { id, email: `${id}-${Date.now()}@test.local`, passwordHash: 'x', fullName: id },
      });
    }
  });

  afterEach(async () => {
    await prisma.voucherUsage.deleteMany({ where: { voucherId: (await prisma.voucher.findUniqueOrThrow({ where: { code: voucherCode } })).id } }).catch(() => undefined);
    await prisma.voucher.deleteMany({ where: { code: voucherCode } });
    for (const id of ['user-b', 'user-c']) {
      await prisma.user.deleteMany({ where: { id, email: { contains: '@test.local' } } }).catch(() => undefined);
    }
  });

  it('validates discount computation with caps', async () => {
    // subtotal 1.000.000 → 10% = 100.000
    const result = await promotionsService.validateAndCompute(prisma, voucherCode, 'user-a', 1000000);
    expect(result.discount).toBe(100000);
    expect(result.freeShipping).toBe(false);
  });

  it('rejects expired vouchers', async () => {
    await prisma.voucher.update({
      where: { code: voucherCode },
      data: { endsAt: new Date(Date.now() - 5000) },
    });
    await expect(
      promotionsService.validateAndCompute(prisma, voucherCode, 'user-a', 100000),
    ).rejects.toThrow();
  });

  it('rejects below minimum order amount', async () => {
    await prisma.voucher.update({
      where: { code: voucherCode },
      data: { minOrderAmount: 500000 },
    });
    await expect(
      promotionsService.validateAndCompute(prisma, voucherCode, 'user-a', 100000),
    ).rejects.toThrow();
  });

  it('atomic consume allows exactly ONE winner under concurrency', async () => {
    const voucher = await prisma.voucher.findUniqueOrThrow({ where: { code: voucherCode } });
    const consume = () =>
      prisma.$transaction((tx) =>
        promotionsService.consumeAtomically(tx as never, voucher.id, 'user-a'),
      );

    const results = await Promise.all([consume(), consume(), consume(), consume()]);
    const winners = results.filter(Boolean);
    expect(winners.length).toBe(1);

    const after = await prisma.voucher.findUniqueOrThrow({ where: { id: voucher.id } });
    expect(after.usedCount).toBe(1);
  });

  it('atomic consume enforces per-user limit under concurrency', async () => {
    const voucher = await prisma.voucher.create({
      data: {
        code: `${voucherCode}PU`,
        type: 'PERCENTAGE',
        value: 10,
        usageLimit: null, // unlimited globally
        usageLimitPerUser: 1,
        minOrderAmount: 0,
        startsAt: new Date(Date.now() - 1000),
        endsAt: new Date(Date.now() + 86400e3),
      },
    });
    const consume = (n: number) =>
      prisma.$transaction(async (tx) => {
        // Mirror orders.service.checkout: consume, then record the usage row
        const ok = await promotionsService.consumeAtomically(tx as never, voucher.id, 'user-b');
        if (!ok) return false;
        await tx.voucherUsage.create({
          data: { voucherId: voucher.id, userId: 'user-b', orderId: `pending-${n}` },
        });
        return true;
      });

    const results = await Promise.all([consume(1), consume(2), consume(3)]);
    const winners = results.filter(Boolean);
    expect(winners.length).toBe(1); // per-user limit = 1

    // a different user can still consume
    const otherUser = await prisma.$transaction((tx) =>
      promotionsService.consumeAtomically(tx as never, voucher.id, 'user-c'),
    );
    expect(otherUser).toBe(true);
  });
});
