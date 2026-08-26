import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma.service';

@Injectable()
export class WishlistService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly itemInclude = {
    items: {
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          select: {
            id: true, name: true, slug: true, price: true, compareAtPrice: true, ratingAvg: true,
            images: { where: { isPrimary: true }, take: 1 },
          },
        },
      },
    },
  } as const;

  async getOrCreate(userId: string) {
    const existing = await this.prisma.wishlist.findUnique({ where: { userId }, select: { id: true } });
    if (existing) {
      return this.withCardFields(
        (await this.prisma.wishlist.findUnique({ where: { id: existing.id }, include: this.itemInclude }))!,
      );
    }
    try {
      return await this.withCardFields(
        await this.prisma.wishlist.create({ data: { userId }, include: this.itemInclude }),
      );
    } catch {
      // concurrent create — re-read
      return this.withCardFields(
        (await this.prisma.wishlist.findUnique({ where: { userId }, include: this.itemInclude }))!,
      );
    }
  }

  /** Attach the extra fields ProductCard renders (soldCount, reviewCount, stock). */
  private async withCardFields<
    T extends { items: { productId: string; product: Record<string, unknown> }[] },
  >(wishlist: T): Promise<T> {
    const ids = wishlist.items.map((i) => i.productId);
    if (!ids.length) return wishlist;
    const [products, invs] = await Promise.all([
      this.prisma.product.findMany({
        where: { id: { in: ids } },
        select: { id: true, soldCount: true, reviewCount: true },
      }),
      this.prisma.inventory.findMany({
        where: { productId: { in: ids }, variantId: null },
        select: { productId: true, availableStock: true },
      }),
    ]);
    const byId = new Map(products.map((p) => [p.id, p]));
    const stockById = new Map(invs.map((i) => [i.productId, i.availableStock]));
    return {
      ...wishlist,
      items: wishlist.items.map((i) => ({
        ...i,
        product: {
          ...i.product,
          soldCount: byId.get(i.productId)?.soldCount ?? 0,
          reviewCount: byId.get(i.productId)?.reviewCount ?? 0,
          inventory: { availableStock: stockById.get(i.productId) ?? 0 },
        },
      })),
    };
  }

  /** Idempotent add. */
  async addItem(userId: string, productId: string) {
    const wishlist = await this.getOrCreate(userId);
    const exists = await this.prisma.wishlistItem.findFirst({
      where: { wishlistId: wishlist.id, productId },
    });
    if (!exists) {
      await this.prisma.wishlistItem.create({ data: { wishlistId: wishlist.id, productId } });
    }
    return this.getOrCreate(userId);
  }

  async removeItem(userId: string, productId: string) {
    const wishlist = await this.getOrCreate(userId);
    await this.prisma.wishlistItem.deleteMany({ where: { wishlistId: wishlist.id, productId } });
    return this.getOrCreate(userId);
  }

  /** Move a wishlisted product into the cart (validates stock). */
  async moveToCart(userId: string, productId: string, cartService: { addItem: (cartId: string, dto: { productId: string; quantity: number }) => Promise<unknown> }, cartId: string) {
    const wishlist = await this.getOrCreate(userId);
    const item = await this.prisma.wishlistItem.findFirst({ where: { wishlistId: wishlist.id, productId } });
    if (!item) throw new NotFoundException('Product not in wishlist');
    // Throws OUT_OF_STOCK when unavailable — wishlist entry preserved
    await cartService.addItem(cartId, { productId, quantity: 1 });
    await this.prisma.wishlistItem.deleteMany({ where: { wishlistId: wishlist.id, productId } });
    return { moved: true };
  }
}
