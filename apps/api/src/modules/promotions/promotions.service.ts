import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma.service';

export interface VoucherDto {
  code: string;
  type: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_SHIPPING';
  value: number;
  maxDiscountAmount?: number | null;
  minOrderAmount?: number;
  usageLimit?: number | null;
  usageLimitPerUser?: number;
  startsAt: string;
  endsAt: string;
  status?: 'ACTIVE' | 'INACTIVE';
}

type Tx = Parameters<Parameters<PrismaService['$transaction']>[0]>[0];

@Injectable()
export class PromotionsService {
  constructor(private readonly prisma: PrismaService) {}

  listVouchers() {
    return this.prisma.voucher.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Public: active vouchers for banners (no sensitive counters beyond remaining). */
  async listActive() {
    const now = new Date();
    const vouchers = await this.prisma.voucher.findMany({
      where: {
        status: 'ACTIVE',
        deletedAt: null,
        startsAt: { lte: now },
        endsAt: { gte: now },
      },
      select: {
        code: true, type: true, value: true, maxDiscountAmount: true, minOrderAmount: true,
        startsAt: true, endsAt: true,
      },
    });
    return vouchers;
  }

  async createVoucher(dto: VoucherDto) {
    const code = dto.code.toUpperCase().trim();
    const exists = await this.prisma.voucher.findUnique({ where: { code } });
    if (exists) throw new NotFoundException('Voucher code already exists');
    return this.prisma.voucher.create({
      data: {
        code,
        type: dto.type,
        value: dto.value,
        maxDiscountAmount: dto.maxDiscountAmount,
        minOrderAmount: dto.minOrderAmount ?? 0,
        usageLimit: dto.usageLimit,
        usageLimitPerUser: dto.usageLimitPerUser ?? 1,
        startsAt: new Date(dto.startsAt),
        endsAt: new Date(dto.endsAt),
        status: dto.status ?? 'ACTIVE',
      },
    });
  }

  updateVoucher(id: string, dto: Partial<VoucherDto>) {
    return this.prisma.voucher.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.startsAt ? { startsAt: new Date(dto.startsAt) } : {}),
        ...(dto.endsAt ? { endsAt: new Date(dto.endsAt) } : {}),
      },
    });
  }

  async removeVoucher(id: string) {
    await this.prisma.voucher.update({ where: { id }, data: { deletedAt: new Date(), status: 'EXPIRED' } });
    return { message: 'Deleted' };
  }

  /**
   * Validate voucher against a subtotal (BR-3). Returns discount amount.
   * FREE_SHIPPING returns discount = 0 and freeShipping = true.
   */
  async validateAndCompute(
    tx: Tx | PrismaService,
    code: string,
    userId: string,
    subtotal: number,
  ): Promise<{ discount: number; freeShipping: boolean; voucherId: string }> {
    const now = new Date();
    const voucher = await (tx as PrismaService).voucher.findUnique({ where: { code: code.toUpperCase().trim() } });
    if (!voucher || voucher.deletedAt) throw new NotFoundException('Voucher not found');
    if (voucher.status !== 'ACTIVE') throw new Error('VOUCHER_INACTIVE');
    if (voucher.startsAt > now) throw new Error('VOUCHER_NOT_STARTED');
    if (voucher.endsAt < now) throw new Error('VOUCHER_EXPIRED');
    if (voucher.usageLimit != null && voucher.usedCount >= voucher.usageLimit) throw new Error('VOUCHER_LIMIT_REACHED');

    const userUsage = await (tx as PrismaService).voucherUsage.count({
      where: { voucherId: voucher.id, userId },
    });
    if (userUsage >= voucher.usageLimitPerUser) throw new Error('VOUCHER_USER_LIMIT_REACHED');
    if (subtotal < voucher.minOrderAmount) throw new Error('VOUCHER_MIN_ORDER');

    let discount = 0;
    if (voucher.type === 'PERCENTAGE') {
      discount = Math.floor((subtotal * voucher.value) / 100);
    } else if (voucher.type === 'FIXED_AMOUNT') {
      discount = voucher.value;
    }
    if (voucher.maxDiscountAmount) discount = Math.min(discount, voucher.maxDiscountAmount);
    discount = Math.min(discount, subtotal); // never exceed order value

    return { discount, freeShipping: voucher.type === 'FREE_SHIPPING', voucherId: voucher.id };
  }

  /**
   * Atomic usage increment — enforces BOTH the global `usageLimit` and the per-user
   * `usageLimitPerUser` under concurrency.
   *
   * Lock-first pattern: `SELECT ... FOR UPDATE` takes a row lock on the voucher that
   * is held until the surrounding checkout transaction commits, so concurrent
   * consumers serialize here. Only after locking do we count existing usages —
   * guaranteeing the per-user count includes rows inserted by transactions that
   * committed while we were waiting (a plain guarded UPDATE would re-check against
   * a stale snapshot and let two checkouts slip through).
   *
   * Returns false when a limit was reached between validation and apply.
   */
  async consumeAtomically(tx: Tx, voucherId: string, userId: string): Promise<boolean> {
    const locked: { id: string; usageLimitPerUser: number }[] = await tx.$queryRaw`
      SELECT id, "usageLimitPerUser" FROM vouchers
      WHERE id = ${voucherId}
        AND status = 'ACTIVE'
        AND "endsAt" >= NOW()
        AND ("usageLimit" IS NULL OR "usedCount" < "usageLimit")
      FOR UPDATE`;
    const voucher = locked[0];
    if (!voucher) return false;

    const usage: { count: bigint }[] = await tx.$queryRaw`
      SELECT COUNT(*) AS count FROM voucher_usages
      WHERE "voucherId" = ${voucherId} AND "userId" = ${userId}`;
    if (Number(usage[0]?.count ?? 0) >= voucher.usageLimitPerUser) return false;

    const incremented: { id: string }[] = await tx.$queryRaw`
      UPDATE vouchers SET "usedCount" = "usedCount" + 1
      WHERE id = ${voucher.id}
      RETURNING id`;
    return incremented.length === 1;
  }

  /** Refund a consumed voucher when an order is cancelled/refunded. */
  async refundUsage(tx: Tx, voucherCode: string) {
    await (tx as PrismaService).voucher.updateMany({
      where: { code: voucherCode.toUpperCase(), usedCount: { gt: 0 } },
      data: { usedCount: { decrement: 1 } },
    });
  }

  // Flash sale / product promotions
  listActivePromotions() {
    const now = new Date();
    return this.prisma.promotion.findMany({
      where: { isActive: true, startsAt: { lte: now }, endsAt: { gte: now } },
    });
  }

  createPromotion(dto: {
    name: string; type: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_SHIPPING';
    scope?: 'ALL' | 'PRODUCT' | 'CATEGORY' | 'BRAND'; scopeId?: string;
    value: number; maxDiscountAmount?: number; startsAt: string; endsAt: string;
  }) {
    return this.prisma.promotion.create({
      data: {
        name: dto.name,
        type: dto.type,
        scope: dto.scope ?? 'ALL',
        scopeId: dto.scopeId,
        value: dto.value,
        maxDiscountAmount: dto.maxDiscountAmount,
        startsAt: new Date(dto.startsAt),
        endsAt: new Date(dto.endsAt),
      },
    });
  }
}
