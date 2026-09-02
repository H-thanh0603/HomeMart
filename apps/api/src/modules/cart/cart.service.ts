import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from 'src/generated/prisma/client';
import { PrismaService } from '../../infra/prisma.service';
import { BusinessRuleError } from '../../common/exceptions/business.errors';

const cartInclude = {
  // NOTE: no savedForLater filter here — the UI renders a separate
  // "saved for later" section from the same payload. Checkout re-filters.
  items: {
    orderBy: { createdAt: 'asc' },
    include: {
      product: {
        select: {
          id: true, name: true, slug: true, sku: true, price: true, compareAtPrice: true,
          images: { where: { isPrimary: true }, take: 1 },
        },
      },
      variant: { include: { inventory: true } },
    },
  },
} satisfies Prisma.CartInclude;

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  /** Resolve cart for logged-in user or guest token (auto-create). */
  async getOrCreate(userId?: string, guestToken?: string): Promise<NonNullable<Awaited<ReturnType<typeof this.getCartById>>>> {
    if (userId) {
      const existing = await this.prisma.cart.findFirst({
        where: { userId, status: 'ACTIVE' },
      });
      return existing ? ((await this.getCartById(existing.id))!) : this.prisma.cart.create({ data: { userId } }).then((c) => this.getCartById(c.id) as never);
    }
    if (!guestToken) throw new ForbiddenException('Missing cart identity');
    const existing = await this.prisma.cart.findUnique({ where: { guestToken }, select: { id: true } });
    return existing
      ? (await this.getCartById(existing.id))!
      : this.prisma.cart.create({ data: { guestToken } }).then((c) => this.getCartById(c.id) as never);
  }

  private async getCartById(cartId: string) {
    const cart = await this.prisma.cart.findUnique({ where: { id: cartId }, include: cartInclude });
    if (!cart) return null;
    return this.withSimpleProductStock(cart);
  }

  /** Product has no direct inventory relation (simple products use variantId=null rows). */
  private async withSimpleProductStock<T extends {
    items: { productId: string; variantId: string | null; product: Record<string, unknown> }[];
  }>(cart: T): Promise<T> {
    const simpleIds = cart.items.filter((i) => !i.variantId).map((i) => i.productId);
    const stockByProduct = new Map<string, number>();
    if (simpleIds.length) {
      const invs = await this.prisma.inventory.findMany({
        where: { productId: { in: simpleIds }, variantId: null },
        select: { productId: true, availableStock: true },
      });
      for (const inv of invs) stockByProduct.set(inv.productId, inv.availableStock);
    }
    return {
      ...cart,
      items: cart.items.map((i) =>
        i.variantId
          ? i
          : { ...i, product: { ...i.product, inventory: { availableStock: stockByProduct.get(i.productId) ?? 0 } } },
      ),
    };
  }

  private fullInclude() {
    return { include: { ...cartInclude, items: { include: { product: true, variant: true } } } };
  }

  async addItem(cartId: string, dto: { productId: string; variantId?: string; quantity: number }) {
    const inv = await this.getInventory(dto.productId, dto.variantId);
    const existing = await this.prisma.cartItem.findFirst({
      where: { cartId, productId: dto.productId, variantId: dto.variantId ?? null },
    });
    const currentQty = existing?.quantity ?? 0;
    const newQty = currentQty + dto.quantity;
    if (newQty > inv.availableStock) {
      throw new BusinessRuleError(`Only ${inv.availableStock} item(s) in stock`, 'OUT_OF_STOCK');
    }
    if (existing) {
      await this.prisma.cartItem.update({ where: { id: existing.id }, data: { quantity: newQty, savedForLater: false } });
    } else {
      await this.prisma.cartItem.create({
        data: { cartId, productId: dto.productId, variantId: dto.variantId, quantity: dto.quantity },
      });
    }
    return this.getCartById(cartId);
  }

  async updateQuantity(cartId: string, itemId: string, quantity: number) {
    const item = await this.assertItemInCart(cartId, itemId);
    if (quantity <= 0) {
      await this.prisma.cartItem.delete({ where: { id: itemId } });
      return this.getCartById(cartId);
    }
    const inv = await this.getInventory(item.productId, item.variantId);
    if (quantity > inv.availableStock) {
      throw new BusinessRuleError(`Only ${inv.availableStock} item(s) in stock`, 'OUT_OF_STOCK');
    }
    await this.prisma.cartItem.update({ where: { id: itemId }, data: { quantity } });
    return this.getCartById(cartId);
  }

  async removeItem(cartId: string, itemId: string) {
    await this.assertItemInCart(cartId, itemId);
    await this.prisma.cartItem.delete({ where: { id: itemId } });
    return this.getCartById(cartId);
  }

  async toggleSaved(cartId: string, itemId: string) {
    const item = await this.assertItemInCart(cartId, itemId);
    await this.prisma.cartItem.update({ where: { id: itemId }, data: { savedForLater: !item.savedForLater } });
    return this.getCartById(cartId);
  }

  /**
   * Merge guest cart into user cart after login. Dedupes by (productId, variantId),
   * sums quantities (capped at stock), marks guest cart MERGED.
   */
  async mergeGuestCart(userId: string, guestToken: string) {
    return this.prisma.$transaction(async (tx) => {
      const guestCart = await tx.cart.findUnique({
        where: { guestToken },
        include: { items: true },
      });
      if (!guestCart || guestCart.status !== 'ACTIVE' || !guestCart.items.length) {
        return this.afterMerge(tx, userId, guestCart?.id);
      }

      let userCart = await tx.cart.findFirst({ where: { userId, status: 'ACTIVE' } });
      userCart ??= await tx.cart.create({ data: { userId } });

      for (const gItem of guestCart.items) {
        const existing = await tx.cartItem.findFirst({
          where: { cartId: userCart.id, productId: gItem.productId, variantId: gItem.variantId },
        });
        if (existing) {
          const mergedQty = Math.min(existing.quantity + gItem.quantity, 99); // hard cap
          await tx.cartItem.update({ where: { id: existing.id }, data: { quantity: mergedQty } });
        } else {
          await tx.cartItem.create({
            data: {
              cartId: userCart.id,
              productId: gItem.productId,
              variantId: gItem.variantId,
              quantity: gItem.quantity,
              savedForLater: gItem.savedForLater,
            },
          });
        }
      }
      await tx.cart.update({ where: { id: guestCart.id }, data: { status: 'MERGED' } });
      // Stock re-validated at checkout anyway
      return this.afterMerge(tx, userId, guestCart.id);
    });
  }

  private async afterMerge(tx: Prisma.TransactionClient, userId: string, _guestCartId?: string) {
    const cart = await tx.cart.findFirst({ where: { userId, status: 'ACTIVE' }, include: cartInclude });
    return cart;
  }

  private async assertItemInCart(cartId: string, itemId: string) {
    const item = await this.prisma.cartItem.findUnique({ where: { id: itemId } });
    if (!item || item.cartId !== cartId) throw new NotFoundException('Cart item not found');
    return item;
  }

  private async getInventory(productId: string, variantId?: string | null) {
    const inv = await this.prisma.inventory.findFirst({
      where: variantId ? { variantId } : { productId, variantId: null },
    });
    if (!inv) throw new NotFoundException('Product inventory not found');
    return inv;
  }
}
