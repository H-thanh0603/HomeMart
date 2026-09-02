import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma, InventoryTransactionType } from 'src/generated/prisma/client';
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
   * Oversell is impossible: rows are locked with SELECT ... FOR UPDATE and
   * stock is re-validated under the lock before any decrement.
   *
   * Flash-sale hot path — deliberately set-based (constant query count for
   * any number of items): one findMany to resolve rows, one FOR UPDATE over
   * all rows in deterministic id order (deadlock avoidance), one batched
   * conditional UPDATE, one createMany for the ledger. Quantities for the
   * same inventory row are aggregated first so the UPDATE ... FROM join key
   * stays unique (Postgres picks an arbitrary match on duplicates).
   * Any insufficiency throws, rolling back the whole transaction.
   */
  async reserve(tx: Tx, items: ReserveItem[], orderId: string) {
    if (!items.length) return;

    // 1. Resolve inventory rows for every item in one query
    const invs = await tx.inventory.findMany({
      where: {
        OR: items.map((i) => (i.variantId ? { variantId: i.variantId } : { productId: i.productId, variantId: null })),
      },
    });
    const byItemKey = new Map(invs.map((inv) => [inv.variantId ?? inv.productId, inv]));
    const qtyByInvId = new Map<string, { qty: number; item: ReserveItem }>();
    for (const item of items) {
      const inv = byItemKey.get(item.variantId ?? item.productId);
      if (!inv) throw new NotFoundException(`Inventory not found for product ${item.productId}`);
      const agg = qtyByInvId.get(inv.id);
      if (agg) agg.qty += item.quantity;
      else qtyByInvId.set(inv.id, { qty: item.quantity, item });
    }

    const ids = [...qtyByInvId.keys()].sort();

    // 2. Lock all rows in deterministic order
    const locked: { id: string; availableStock: number }[] = await tx.$queryRaw`
      SELECT id, "availableStock" FROM inventories WHERE id IN (${Prisma.join(ids)}) ORDER BY id FOR UPDATE`;
    const lockedById = new Map(locked.map((r) => [r.id, r]));

    // 3. Validate under the lock — names the offending product
    for (const [invId, { qty }] of qtyByInvId) {
      const row = lockedById.get(invId);
      if (!row) throw new NotFoundException('Inventory not found');
      if (row.availableStock < qty) {
        throw new BusinessRuleError(`Insufficient stock: only ${row.availableStock} left`, 'OUT_OF_STOCK');
      }
    }

    // 4. Apply every decrement in one statement (double-guarded with >=)
    const values = Prisma.join(
      [...qtyByInvId.entries()].map(([id, { qty }]) => Prisma.sql`(${id}::text, ${qty}::int)`),
    );
    await tx.$executeRaw`
      UPDATE inventories AS i
      SET "availableStock" = i."availableStock" - v.qty,
          "reservedStock" = i."reservedStock" + v.qty
      FROM (VALUES ${values}) AS v(id, qty)
      WHERE i.id = v.id AND i."availableStock" >= v.qty`;

    // 5. Ledger rows in one statement
    await tx.inventoryTransaction.createMany({
      data: [...qtyByInvId.entries()].map(([invId, { qty }]) => ({
        inventoryId: invId,
        type: InventoryTransactionType.RESERVE,
        quantity: -qty,
        reference: orderId,
      })),
    });
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
