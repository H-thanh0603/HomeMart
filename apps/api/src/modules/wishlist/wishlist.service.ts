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
            id: true, name: true, slug: true, sku: true, price: true, compareAtPrice: true, ratingAvg: true,
            soldCount: true, reviewCount: true,
            images: { where: { isPrimary: true }, take: 1 },
            inventory: { select: { availableStock: true } },
          },
        },
      },
    },
  } as const;

  async getOrCreate(userId: string) {
    const existing = await this.prisma.wishlist.findUnique({ where: { userId }, select: { id: true } });
    if (existing) {
      return (await this.prisma.wishlist.findUnique({ where: { id: existing.id }, include: this.itemInclude }))!;
    }
    try {
      return await this.prisma.wishlist.create({ data: { userId }, include: this.itemInclude });
    } catch {
      // concurrent create — re-read
      return (await this.prisma.wishlist.findUnique({ where: { userId }, include: this.itemInclude }))!;
    }
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
