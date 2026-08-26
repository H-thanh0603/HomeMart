import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma.service';
import { BusinessRuleError } from '../../common/exceptions/business.errors';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * BR-6: only DELIVERED/COMPLETED order items of the requesting user can be reviewed,
   * and each item exactly once.
   */
  async create(userId: string, dto: { orderItemId: string; rating: number; comment?: string; imageUrls?: string[] }) {
    if (dto.rating < 1 || dto.rating > 5) throw new BusinessRuleError('Rating must be 1-5', 'INVALID_RATING');

    const item = await this.prisma.orderItem.findUnique({
      where: { id: dto.orderItemId },
      include: { order: { select: { userId: true, status: true } }, reviewed: { select: { id: true } } },
    });
    if (!item) throw new NotFoundException('Order item not found');
    if (item.order.userId !== userId) throw new ForbiddenException('Not your purchase');
    if (!['DELIVERED', 'COMPLETED'].includes(item.order.status)) {
      throw new BusinessRuleError('You can review after the order is delivered', 'ORDER_NOT_ELIGIBLE');
    }
    if (item.reviewed) throw new BusinessRuleError('This item has already been reviewed', 'ALREADY_REVIEWED');

    return this.prisma.$transaction(async (tx) => {
      const review = await tx.review.create({
        data: {
          userId,
          productId: item.productId,
          orderItemId: item.id,
          rating: dto.rating,
          comment: dto.comment,
          status: 'APPROVED', // auto-approve; moderation can hide later. Set PENDING for manual queue.
          images: dto.imageUrls?.length ? { create: dto.imageUrls.map((url) => ({ url })) } : undefined,
        },
        include: { images: true },
      });
      // Recompute aggregates from APPROVED reviews
      await this.recomputeProductRating(tx, item.productId);
      return review;
    });
  }

  async listByProductSlug(slug: string, page = 1, limit = 10) {
    const product = await this.prisma.product.findUnique({ where: { slug }, select: { id: true } });
    if (!product) throw new NotFoundException('Product not found');
    return this.listByProduct(product.id, page, limit);
  }

  async listByProduct(productId: string, page = 1, limit = 10) {    return this.prisma.$transaction([
      this.prisma.review.findMany({
        where: { productId, status: 'APPROVED', deletedAt: null },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: { select: { fullName: true, avatarUrl: true } },
          images: true,
        },
      }),
      this.prisma.review.count({ where: { productId, status: 'APPROVED', deletedAt: null } }),
    ]).then(([items, total]) => ({ items, total, page, limit }));
  }

  ratingDistribution(productId: string) {
    return this.prisma.review.groupBy({
      by: ['rating'],
      where: { productId, status: 'APPROVED', deletedAt: null },
      _count: { rating: true },
    }).then((rows) => rows.map((r) => ({ rating: r.rating, count: r._count.rating })));
  }

  /** Admin moderation. */
  async moderate(reviewId: string, status: 'APPROVED' | 'HIDDEN') {
    const review = await this.prisma.review.findUniqueOrThrow({ where: { id: reviewId } });
    await this.prisma.review.update({ where: { id: reviewId }, data: { status } });
    await this.recomputeProductRating(this.prisma, review.productId);
    return { message: `Review ${status.toLowerCase()}` };
  }

  private async recomputeProductRating(client: PrismaService | Parameters<Parameters<PrismaService['$transaction']>[0]>[0], productId: string) {
    const agg = await client.review.aggregate({
      where: { productId, status: 'APPROVED', deletedAt: null },
      _avg: { rating: true },
      _count: true,
    });
    await client.product.update({
      where: { id: productId },
      data: {
        ratingAvg: agg._avg.rating ?? 0,
        reviewCount: agg._count,
      },
    });
  }
}
