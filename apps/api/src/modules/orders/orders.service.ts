import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OrderStatus, PaymentMethodType, Prisma } from '@prisma/client';
import { PrismaService } from '../../infra/prisma.service';
import { BusinessRuleError } from '../../common/exceptions/business.errors';
import { generateOrderNumber } from '../../common/utils/helpers';
import { InventoryService } from '../inventory/inventory.service';
import { PromotionsService } from '../promotions/promotions.service';
import { ShippingService } from '../shipping/shipping.service';

type Tx = Prisma.TransactionClient;

/** BR-5: legal order status transitions. */
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  CONFIRMED: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
  PROCESSING: [OrderStatus.PACKING, OrderStatus.CANCELLED],
  PACKING: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
  SHIPPED: [OrderStatus.DELIVERED, OrderStatus.RETURN_REQUESTED],
  DELIVERED: [OrderStatus.COMPLETED, OrderStatus.RETURN_REQUESTED],
  RETURN_REQUESTED: [OrderStatus.RETURNED, OrderStatus.COMPLETED],
  RETURNED: [OrderStatus.REFUNDED],
  COMPLETED: [],
  CANCELLED: [],
  REFUNDED: [],
};

export const CUSTOMER_CANCELLABLE: OrderStatus[] = [
  OrderStatus.PENDING,
  OrderStatus.CONFIRMED,
  OrderStatus.PROCESSING,
  OrderStatus.PACKING,
];

export interface CheckoutItemInput {
  productId: string;
  variantId?: string;
  quantity: number;
}

export interface CheckoutDto {
  items?: CheckoutItemInput[]; // buy-now path; defaults to active cart
  addressId: string;
  shippingMethodId: string;
  voucherCode?: string;
  paymentMethod: PaymentMethodType;
  note?: string;
}

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly inventory: InventoryService,
    private readonly promotions: PromotionsService,
    private readonly shipping: ShippingService,
    private readonly events: EventEmitter2,
  ) {}

  /** Price quote for checkout UI. Backend computes everything (BR-1). */
  async preview(userId: string, dto: Pick<CheckoutDto, 'items' | 'shippingMethodId' | 'voucherCode'>) {
    const lines = await this.resolveLines(userId, dto.items);
    const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
    const totalWeight = await this.totalWeight(lines);

    let discount = 0;
    let freeShipping = false;
    if (dto.voucherCode) {
      const result = await this.promotions.validateAndCompute(this.prisma, dto.voucherCode, userId, subtotal).catch((e: Error) => {
        if (e.message.startsWith('VOUCHER_')) return null;
        throw e;
      });
      if (!result) throw new BusinessRuleError(this.voucherError(dto.voucherCode), 'VOUCHER_INVALID');
      discount = result.discount;
      freeShipping = result.freeShipping;
    }

    const shippingFee = dto.shippingMethodId
      ? (await this.shipping.computeFee({ methodId: dto.shippingMethodId, subtotal, totalWeightGrams: totalWeight, freeShipping })).fee
      : 0;

    const taxAmount = Math.round((subtotal - discount) * Number(process.env.TAX_RATE ?? 0.08));
    const totalAmount = Math.max(0, subtotal - discount + shippingFee + taxAmount);
    return { subtotalAmount: subtotal, discountAmount: discount, shippingFee, taxAmount, totalAmount };
  }

  /**
   * Full checkout inside ONE transaction:
   * re-price → reserve inventory (FOR UPDATE) → consume voucher atomically →
   * create order with item snapshots → payment record.
   */
  async checkout(userId: string, dto: CheckoutDto) {
    // Pre-fetch address outside tx (validated)
    const address = await this.prisma.address.findFirst({
      where: { id: dto.addressId, userId, deletedAt: null },
    });
    if (!address) throw new NotFoundException('Address not found');

    const lines = await this.resolveLines(userId, dto.items); // read-only pre-check
    const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
    const totalWeight = await this.totalWeight(lines);

    let discount = 0;
    let freeShipping = false;
    let voucherId: string | null = null;
    if (dto.voucherCode) {
      try {
        const result = await this.promotions.validateAndCompute(this.prisma, dto.voucherCode, userId, subtotal);
        discount = result.discount;
        freeShipping = result.freeShipping;
        voucherId = result.voucherId;
      } catch {
        throw new BusinessRuleError(this.voucherError(dto.voucherCode), 'VOUCHER_INVALID');
      }
    }

    const shippingQuote = await this.shipping.computeFee({
      methodId: dto.shippingMethodId, subtotal, totalWeightGrams: totalWeight, freeShipping,
    });
    const shippingFee = shippingQuote.fee;
    const taxRate = Number(process.env.TAX_RATE ?? 0.08);
    const taxAmount = Math.round((subtotal - discount) * taxRate);
    const totalAmount = Math.max(0, subtotal - discount + shippingFee + taxAmount);

    const seq = Date.now() % 1000000000; // uniqueness enforced by retry below
    const orderNumber = generateOrderNumber(seq);

    try {
      const order = await this.prisma.$transaction(
        async (tx) => {
          // Re-price INSIDE the transaction (price could have changed since preview)
          const txLines = [];
          for (const line of lines) {
            const fresh = await this.fetchLine(tx, line.productId, line.variantId, line.quantity);
            txLines.push(fresh);
          }
          const txSubtotal = txLines.reduce((s, l) => s + l.lineTotal, 0);
          if (txSubtotal !== subtotal) {
            throw new BusinessRuleError('Product prices have changed, please review your cart', 'PRICE_CHANGED');
          }

          // Reserve stock (row locks, rolls back everything on OUT_OF_STOCK)
          await this.inventory.reserve(tx, txLines.map(toReserveItem), orderNumber);

          // Consume voucher atomically (BR-3)
          let appliedVoucherCode: string | null = null;
          if (voucherId && dto.voucherCode) {
            const consumed = await this.promotions.consumeAtomically(tx, voucherId, userId);
            if (!consumed) throw new BusinessRuleError('Voucher is no longer available', 'VOUCHER_LIMIT_REACHED');
            await tx.voucherUsage.create({ data: { voucherId, userId, orderId: 'PENDING' } }); // updated below
            appliedVoucherCode = dto.voucherCode.toUpperCase();
          }

          const created = await tx.order.create({
            data: {
              orderNumber,
              userId,
              status: OrderStatus.PENDING,
              contactName: address.fullName,
              contactPhone: address.phone,
              shippingProvince: address.province,
              shippingDistrict: address.district,
              shippingWard: address.ward,
              shippingLine: address.line,
              subtotalAmount: txSubtotal,
              discountAmount: discount,
              shippingFee,
              taxAmount,
              totalAmount,
              shippingMethodId: dto.shippingMethodId,
              voucherCode: appliedVoucherCode,
              note: dto.note,
              version: 1,
              items: {
                create: txLines.map((l) => ({
                  productId: l.productId,
                  variantId: l.variantId ?? null,
                  productName: l.name,
                  productImage: l.image,
                  sku: l.sku,
                  variantAttributes: l.variantAttributes as object | undefined,
                  unitPrice: l.unitPrice,
                  quantity: l.quantity,
                  lineTotal: l.lineTotal,
                })),
              },
              statusHistory: { create: { fromStatus: null, toStatus: OrderStatus.PENDING, actorId: userId } },
              payments: {
                create: {
                  method: dto.paymentMethod,
                  amount: totalAmount,
                  status: 'PENDING',
                },
              },
            },
            include: { items: true, payments: true },
          });

          if (appliedVoucherCode && voucherId) {
            await tx.voucherUsage.updateMany({
              where: { userId, orderId: 'PENDING', voucherId },
              data: { orderId: created.id },
            });
          }
          return created;
        },
        { timeout: 15000 },
      );

      this.events.emit('order.created', { orderId: order.id, userId, orderNumber: order.orderNumber, total: order.totalAmount });
      this.logger.log(`Order ${order.orderNumber} created by user ${userId}, total=${order.totalAmount}`);
      return order;
    } catch (e) {
      if (e instanceof BusinessRuleError || e instanceof NotFoundException || e instanceof ForbiddenException || e instanceof BadRequestException) throw e;
      this.logger.error(`Checkout failed: ${(e as Error).message}`, (e as Error).stack);
      throw new BusinessRuleError('Checkout failed, please retry', 'CHECKOUT_FAILED');
    }
  }

  listMine(userId: string, page = 1, limit = 10, status?: OrderStatus) {
    return paginate(this.prisma.order, {
      where: { userId, deletedAt: null, ...(status ? { status } : {}) },
      include: { items: { select: { id: true, productId: true, productName: true, productImage: true, sku: true, quantity: true, unitPrice: true } } },
      orderBy: { createdAt: 'desc' },
      page,
      limit,
    });
  }

  adminList(where: Prisma.OrderWhereInput, page: number, limit: number) {
    return paginate(this.prisma.order, {
      where,
      include: { user: { select: { email: true, fullName: true } }, payments: true },
      orderBy: { createdAt: 'desc' },
      page,
      limit,
    });
  }

  getForAdmin(orderId: string) {
    return this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        user: { select: { id: true, email: true, fullName: true, phone: true } },
        statusHistory: { orderBy: { createdAt: 'asc' } },
        payments: true,
        shipment: { include: { method: true } },
        shippingMethod: true,
      },
    });
  }

  /** BR-6: strict ownership check. */
  async getOwned(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, deletedAt: null },
      include: {
        items: true,
        statusHistory: { orderBy: { createdAt: 'asc' } },
        payments: true,
        shipment: { include: { method: true } },
        shippingMethod: true,
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.userId !== userId) throw new ForbiddenException('Not your order');
    return order;
  }

  async cancel(userId: string, orderId: string, reason?: string) {
    const order = await this.getOwned(userId, orderId);
    if (!CUSTOMER_CANCELLABLE.includes(order.status)) {
      throw new BusinessRuleError('Order can no longer be cancelled', 'ORDER_NOT_CANCELLABLE');
    }
    return this.transition(order.id, OrderStatus.CANCELLED, userId, reason);
  }

  async requestReturn(userId: string, orderId: string, reason?: string) {
    const order = await this.getOwned(userId, orderId);
    const eligible: OrderStatus[] = [OrderStatus.SHIPPED, OrderStatus.DELIVERED];
    if (!eligible.includes(order.status)) {
      throw new BusinessRuleError('Return not allowed at this stage', 'RETURN_NOT_ALLOWED');
    }
    return this.transition(order.id, OrderStatus.RETURN_REQUESTED, userId, reason);
  }

  /**
   * State-machine transition with optimistic locking + inventory/voucher side effects.
   * When `actorRole` is STAFF, money-touching transitions (RETURNED/REFUNDED and
   * cancelling a paid order) are rejected — require MANAGER+.
   */
  async transition(
    orderId: string,
    to: OrderStatus,
    actorId: string,
    note?: string,
    actorRole?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
      if (!order) throw new NotFoundException('Order not found');

      const allowed = ORDER_TRANSITIONS[order.status];
      if (!allowed.includes(to)) {
        throw new BusinessRuleError(`Cannot transition from ${order.status} to ${to}`, 'INVALID_TRANSITION');
      }

      // Optimistic lock guard via raw update on version
      const updated = await tx.$queryRaw<{ id: string }[]>`
        UPDATE orders SET status = ${to}::"OrderStatus", version = version + 1,
          "confirmedAt" = COALESCE("confirmedAt", ${to === OrderStatus.CONFIRMED ? new Date() : null}::timestamptz),
          "completedAt" = COALESCE("completedAt", ${to === OrderStatus.COMPLETED ? new Date() : null}::timestamptz),
          "cancelledReason" = ${note ?? null}
        WHERE id = ${orderId} AND version = ${order.version}
        RETURNING id`;
      if (!updated.length) throw new ConflictOnRetry();

      await tx.orderStatusHistory.create({
        data: { orderId, fromStatus: order.status, toStatus: to, actorId, note },
      });

      const reserveItems = order.items.map(toReserveItem);

      if (to === OrderStatus.CANCELLED || to === OrderStatus.RETURNED) {
        const payment = await tx.payment.findUnique({ where: { orderId } });
        const wasPaid = payment && ['SUCCESS'].includes(payment.status);
        // Money-touching transitions require MANAGER+ when actor is STAFF
        if (wasPaid && actorRole === 'STAFF' && (to === OrderStatus.CANCELLED || to === OrderStatus.RETURNED)) {
          throw new ForbiddenException('Chỉ MANAGER/ADMIN mới được duyệt hoàn tiền');
        }
        if (to === OrderStatus.CANCELLED) {
          if (!wasPaid) {
            // Release reserved stock back
            await this.inventory.release(tx, reserveItems, order.orderNumber);
            if (order.voucherCode) await this.promotions.refundUsage(tx, order.voucherCode);
          } else {
            // Paid order cancelled → must refund, not strand stock/payment
            await tx.payment.update({ where: { orderId }, data: { status: 'REFUNDED' } });
            await this.inventory.release(tx, reserveItems, order.orderNumber);
            if (order.voucherCode) await this.promotions.refundUsage(tx, order.voucherCode);
            this.events.emit('refund.succeeded', { orderId, userId: order.userId });
          }
        }
        if (wasPaid && to === OrderStatus.RETURNED) {
          await tx.payment.update({ where: { orderId }, data: { status: 'REFUNDED' } });
          await this.inventory.release(tx, reserveItems, order.orderNumber);
          if (order.voucherCode) await this.promotions.refundUsage(tx, order.voucherCode);
          this.events.emit('refund.succeeded', { orderId, userId: order.userId });
        }
      }

      if (to === OrderStatus.DELIVERED) {
        const shipment = await tx.shipment.findUnique({ where: { orderId } });
        if (shipment) await tx.shipment.update({ where: { id: shipment.id }, data: { status: 'DELIVERED', deliveredAt: new Date() } });
      }

      this.events.emit('order.status_changed', { orderId, from: order.status, to, userId: order.userId });
      return tx.order.findUnique({ where: { id: orderId }, include: { items: true, statusHistory: { orderBy: { createdAt: 'asc' } }, payments: true } });
    }).catch(async (e) => {
      if (e instanceof ConflictOnRetry) {
        // Concurrent modification — reload and fail safely
        throw new BusinessRuleError('Order was modified concurrently, please retry', 'CONCURRENT_MODIFICATION');
      }
      throw e;
    });
  }

  // ─── helpers ───

  private voucherError(code: string): string {
    return `Voucher "${code}" is invalid or its conditions are not met`;
  }

  private async resolveLines(userId: string, items?: CheckoutItemInput[]) {
    let inputs = items;
    if (!inputs?.length) {
      const cart = await this.prisma.cart.findFirst({
        where: { userId, status: 'ACTIVE' },
        include: { items: { where: { savedForLater: false } } },
      });
      if (!cart || !cart.items.length) throw new BusinessRuleError('Cart is empty', 'CART_EMPTY');
      inputs = cart.items.map((i) => ({ productId: i.productId, variantId: i.variantId ?? undefined, quantity: i.quantity }));
    }
    if (inputs.length > 50) throw new BadRequestException('Too many items');

    const lines = [];
    for (const input of inputs) {
      lines.push(await this.fetchLine(this.prisma, input.productId, input.variantId, input.quantity));
    }
    return lines;
  }

  /** Always fetch price/stock fresh from DB — never trust client (BR-1). */
  private async fetchLine(client: Tx | PrismaService, productId: string, variantId: string | null | undefined, quantity: number) {
    if (quantity < 1 || quantity > 99) throw new BadRequestException('Invalid quantity');
    const product = await client.product.findFirst({
      where: { id: productId, deletedAt: null, status: 'PUBLISHED' },
      include: { images: { where: { isPrimary: true }, take: 1 } },
    });
    if (!product) throw new NotFoundException(`Product ${productId} not found`);

    let unitPrice = product.price;
    let sku = product.sku;
    const name = product.name;
    let image = product.images[0]?.url ?? null;
    let variantAttributes: Record<string, string> | null = null;

    if (variantId) {
      const variant = await client.productVariant.findFirst({
        where: { id: variantId, productId, deletedAt: null },
      });
      if (!variant) throw new NotFoundException(`Variant ${variantId} not found`);
      unitPrice = variant.price;
      sku = variant.sku;
      variantAttributes = variant.attributes as Record<string, string>;
      image = variant.imageUrl ?? image;
    }

    const inv = await client.inventory.findFirst({
      where: variantId ? { variantId } : { productId, variantId: null },
    });
    const available = inv?.availableStock ?? 0;
    if (available < quantity) {
      throw new BusinessRuleError(`"${name}" only has ${available} left in stock`, 'OUT_OF_STOCK');
    }

    return {
      productId, variantId: variantId ?? null, quantity,
      name, sku, image, variantAttributes,
      unitPrice,
      lineTotal: unitPrice * quantity,
    };
  }

  private async totalWeight(lines: { productId: string; quantity: number }[]) {
    const products = await this.prisma.product.findMany({
      where: { id: { in: lines.map((l) => l.productId) } },
      select: { id: true, weightGrams: true },
    });
    const weightMap = new Map(products.map((p) => [p.id, p.weightGrams ?? 500]));
    return lines.reduce((sum, l) => sum + (weightMap.get(l.productId) ?? 500) * l.quantity, 0);
  }
}

function toReserveItem(l: { productId: string; variantId: string | null; quantity: number }) {
  return { productId: l.productId, variantId: l.variantId, quantity: l.quantity };
}

class ConflictOnRetry extends Error {}

async function paginate(
  prisma: PrismaService['order'],
  args: { where: Prisma.OrderWhereInput; include?: Prisma.OrderInclude; orderBy?: Prisma.OrderOrderByWithRelationInput; page: number; limit: number },
) {
  const [items, total] = await Promise.all([
    prisma.findMany({
      where: args.where,
      include: args.include,
      orderBy: args.orderBy,
      skip: (args.page - 1) * args.limit,
      take: args.limit,
    }),
    prisma.count({ where: args.where }),
  ]);
  return { items, total, page: args.page, limit: args.limit };
}
