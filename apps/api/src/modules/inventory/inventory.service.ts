import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma, InventoryTransactionType } from '@prisma/client';
import { PrismaService } from '../../infra/prisma.service';
import { BusinessRuleError } from '../../common/exceptions/business.errors';

export interface ReserveItem {
  productId: string;
  variantId?: string | null;
  quantity: number;
}

type Tx = Prisma.TransactionClient;

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
  ) {}

  /**
   * Atomically reserve stock for order checkout.
   * Uses SELECT ... FOR UPDATE row locking inside a transaction to prevent overselling.
   * Rows are locked in a deterministic order (sorted by inventory id) — two
   * concurrent orders with overlapping items can no longer deadlock.
   * Throws (rolling back the whole tx) when any item is insufficient.
   */
  async reserve(tx: Tx, items: ReserveItem[], orderId: string) {
    const invIds = new Map<string, ReserveItem>();
    for (const item of items) {
      const invId = await this.findInventoryId(tx, item);
      invIds.set(invId, item);
    }
    for (const invId of [...invIds.keys()].sort()) {
      const item = invIds.get(invId)!;
      // Lock the row
      const rows: { id: string; availableStock: number }[] = await tx.$queryRaw`
        SELECT id, "availableStock" FROM inventories WHERE id = ${invId} FOR UPDATE`;
      const locked = rows[0];
      if (!locked) throw new NotFoundException('Inventory not found');
      if (locked.availableStock < item.quantity) {
        throw new BusinessRuleError(
          `Insufficient stock: only ${locked.availableStock} left`,
          'OUT_OF_STOCK',
        );
      }
      await tx.inventory.update({
        where: { id: invId },
        data: {
          availableStock: { decrement: item.quantity },
          reservedStock: { increment: item.quantity },
        },
      });
      await tx.inventoryTransaction.create({
        data: {
          inventoryId: invId,
          type: InventoryTransactionType.RESERVE,
          quantity: -item.quantity,
          reference: orderId,
        },
      });
    }
  }

  /** Payment success → reserved becomes sold. */
  async commitSale(tx: Tx, items: ReserveItem[], orderId: string) {
    for (const item of items) {
      const inv = await this.getInventory(tx, item);
      await tx.inventory.update({
        where: { id: inv.id },
        data: {
          reservedStock: { decrement: item.quantity },
          soldStock: { increment: item.quantity },
        },
      });
      await tx.product.update({
        where: { id: item.productId },
        data: { soldCount: { increment: item.quantity } },
      });
      await tx.inventoryTransaction.create({
        data: {
          inventoryId: inv.id,
          type: InventoryTransactionType.COMMIT_SALE,
          quantity: -item.quantity,
          reference: orderId,
        },
      });
    }
    this.events.emit('inventory.checked', { orderId });
  }

  /** Cancel / payment failure / timeout → give stock back. */
  async release(tx: Tx, items: ReserveItem[], orderId: string) {
    for (const item of items) {
      // Lock the row before the idempotency check: without it, a concurrent
      // cancel + expire-cron double-release can drive reservedStock negative
      // and mint free availableStock.
      const invId = await this.findInventoryId(tx, item);
      const rows: { id: string; reservedStock: number }[] = await tx.$queryRaw`
        SELECT id, "reservedStock" FROM inventories WHERE id = ${invId} FOR UPDATE`;
      const locked = rows[0];
      if (!locked) throw new NotFoundException('Inventory not found');
      if (locked.reservedStock < item.quantity) continue; // already released — idempotent-safe
      await tx.inventory.update({
        where: { id: invId },
        data: {
          reservedStock: { decrement: item.quantity },
          availableStock: { increment: item.quantity },
        },
      });
      await tx.inventoryTransaction.create({
        data: {
          inventoryId: invId,
          type: InventoryTransactionType.RELEASE,
          quantity: item.quantity,
          reference: orderId,
        },
      });
    }
  }

  async adjust(inventoryId: string, deltaAvailable: number, actorId?: string) {
    return this.prisma.$transaction(async (tx) => {
      const inv = await tx.inventory.findUnique({ where: { id: inventoryId } });
      if (!inv) throw new NotFoundException('Inventory not found');
      const next = inv.availableStock + deltaAvailable;
      if (next < 0) throw new BadRequestException('Resulting stock cannot be negative');
      const updated = await tx.inventory.update({
        where: { id: inventoryId },
        data: { availableStock: next },
      });
      await tx.inventoryTransaction.create({
        data: {
          inventoryId,
          type: InventoryTransactionType.ADJUSTMENT,
          quantity: deltaAvailable,
          reference: 'admin_adjustment',
          actorId,
        },
      });
      return updated;
    });
  }

  listLowStock(threshold?: number) {
    return this.prisma.inventory.findMany({
      where: { availableStock: { lte: threshold ?? undefined } },
      include: { product: { select: { name: true, sku: true, slug: true } }, variant: true },
    });
  }

  private async findInventoryId(tx: Tx, item: ReserveItem): Promise<string> {
    const inv = await this.getInventory(tx, item);
    return inv.id;
  }

  private async getInventory(tx: Tx, item: ReserveItem) {
    const inv = await tx.inventory.findFirst({
      where: {
        variantId: item.variantId ?? null,
        productId: item.variantId ? undefined : item.productId,
      },
    });
    if (!inv) throw new NotFoundException(`Inventory not found for product ${item.productId}`);
    return inv;
  }
}
