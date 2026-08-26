import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ProductStatus } from '@prisma/client';
import { PrismaService } from '../../infra/prisma.service';
import { slugify } from '../../common/utils/helpers';

export interface ProductQuery {
  page: number;
  limit: number;
  q?: string;
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'best_selling' | 'rating';
  categoryId?: string;
  categorySlug?: string;
  brandId?: string;
  minPrice?: number;
  maxPrice?: number;
  rating?: number;
  inStock?: boolean;
  onSale?: boolean;
  status?: ProductStatus;
}

const productInclude = {
  images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] },
  variants: { where: { deletedAt: null }, include: { inventory: true } },
  inventories: true,
  category: { select: { id: true, name: true, slug: true } },
  brand: { select: { id: true, name: true, slug: true, logoUrl: true } },
  attributes: true,
} satisfies Prisma.ProductInclude;

/** Expose simple-product stock as `product.inventory` for API consumers. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function withPrimaryInventory(product: any): any {
  if (!product) return product;
  const { inventories, ...rest } = product;
  return { ...rest, inventory: Array.isArray(inventories) ? (inventories.find((i: { variantId: string | null }) => i.variantId === null) ?? null) : null };
}

const publicWhere = { deletedAt: null, status: ProductStatus.PUBLISHED };

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ProductQuery) {
    const where: Prisma.ProductWhereInput = {
      ...(query.status ? {} : publicWhere),
      ...(query.status ? { deletedAt: null, status: query.status } : {}),
      AND: [] as Prisma.ProductWhereInput[],
    };
    const and = where.AND as Prisma.ProductWhereInput[];

    if (query.q) {
      and.push({
        OR: [
          { name: { contains: query.q, mode: 'insensitive' } },
          { sku: { contains: query.q, mode: 'insensitive' } },
          { shortDescription: { contains: query.q, mode: 'insensitive' } },
          { tags: { has: query.q.toLowerCase() } },
        ],
      });
    }
    if (query.categoryId || query.categorySlug) {
      const catIds = await this.resolveCategoryIds(query.categoryId, query.categorySlug);
      if (catIds.length === 0) return this.emptyPage(query);
      where.categoryId = { in: catIds };
    }
    if (query.brandId) where.brandId = query.brandId;
    if (query.minPrice != null || query.maxPrice != null) {
      where.price = { gte: query.minPrice ?? undefined, lte: query.maxPrice ?? undefined };
    }
    if (query.rating) and.push({ ratingAvg: { gte: query.rating - 0.5 } });
    if (query.inStock) {
      and.push({ OR: [
        { variants: { some: { inventory: { availableStock: { gt: 0 } } } } },
        { AND: [
          { variants: { none: {} } },
          { inventories: { some: { variantId: null, availableStock: { gt: 0 } } } },
        ] },
      ] });
    }
    if (query.onSale) and.push({ NOT: { compareAtPrice: null }, OR: [{ compareAtPrice: { gt: {} as never } }] });

    const orderBy: Prisma.ProductOrderByWithRelationInput =
      query.sort === 'price_asc' ? { price: 'asc' } :
      query.sort === 'price_desc' ? { price: 'desc' } :
      query.sort === 'best_selling' ? { soldCount: 'desc' } :
      query.sort === 'rating' ? { ratingAvg: 'desc' } :
      { createdAt: 'desc' };

    if (and.length === 0) delete where.AND;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: { ...productInclude, attributes: false },
      }),
      this.prisma.product.count({ where }),
    ]);
    return { items: items.map(withPrimaryInventory), total, page: query.page, limit: query.limit };
  }

  async findBySlug(slug: string) {
    const product = await this.prisma.product.findFirst({
      where: { slug, ...publicWhere },
      include: { ...productInclude, reviews: false },
    });
    if (!product) throw new NotFoundException('Product not found');
    return withPrimaryInventory(product);
  }

  async findRelated(productId: string, limit = 8) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Product not found');

    // Explicitly curated first, then same-category fallback
    let items = product.relatedProductIds.length
      ? await this.prisma.product.findMany({
          where: { id: { in: product.relatedProductIds }, ...publicWhere },
          include: { ...productInclude, attributes: false },
        })
      : [];
    if (items.length < limit) {
      const fill = await this.prisma.product.findMany({
        where: { categoryId: product.categoryId, id: { notIn: [productId, ...items.map((i) => i.id)] }, ...publicWhere },
        orderBy: { soldCount: 'desc' },
        take: limit - items.length,
        include: { ...productInclude, attributes: false },
      });
      items = [...items, ...fill];
    }
    return items.map(withPrimaryInventory);
  }

  async suggest(q: string, limit = 8) {
    if (!q?.trim()) return [];
    return this.prisma.product.findMany({
      where: {
        ...publicWhere,
        OR: [
          { name: { contains: q.trim(), mode: 'insensitive' } },
          { sku: { contains: q.trim(), mode: 'insensitive' } },
        ],
      },
      select: { id: true, slug: true, name: true, price: true, compareAtPrice: true, images: { where: { isPrimary: true }, take: 1 } },
      take: limit,
    });
  }

  // ───────── Admin CRUD ─────────

  async create(dto: CreateProductDto) {
    const slug = dto.slug || slugify(dto.name);
    await this.assertUnique(slug, dto.sku);
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          sku: dto.sku,
          slug,
          name: dto.name,
          shortDescription: dto.shortDescription,
          description: dto.description,
          categoryId: dto.categoryId,
          brandId: dto.brandId,
          price: dto.price,
          compareAtPrice: dto.compareAtPrice,
          costPrice: dto.costPrice,
          weightGrams: dto.weightGrams,
          warrantyMonths: dto.warrantyMonths,
          origin: dto.origin,
          tags: dto.tags ?? [],
          seoTitle: dto.seoTitle,
          seoDescription: dto.seoDescription,
          relatedProductIds: dto.relatedProductIds ?? [],
          status: dto.status ?? ProductStatus.DRAFT,
          images: dto.images?.length
            ? { create: dto.images.map((img, i) => ({ ...img, isPrimary: img.isPrimary ?? i === 0, sortOrder: i })) }
            : undefined,
          attributes: dto.attributes?.length ? { create: dto.attributes } : undefined,
          variants:
            dto.variants?.length
              ? {
                  create: dto.variants.map((v) => ({
                    sku: v.sku,
                    attributes: v.attributes as object,
                    price: v.price,
                    compareAtPrice: v.compareAtPrice,
                    imageUrl: v.imageUrl,
                    status: ProductStatus.PUBLISHED,
                  })),
                }
              : undefined,
          inventories: dto.variants?.length ? undefined : { create: { availableStock: dto.stock ?? 0 } },
        },
        include: { variants: true },
      });
      // Create inventory rows for each variant (productId is a required scalar)
      if (dto.variants?.length) {
        await tx.inventory.createMany({
          data: product.variants.map((v) => ({
            productId: product.id,
            variantId: v.id,
            availableStock: dto.variants!.find((dv) => dv.sku === v.sku)?.stock ?? 0,
          })),
        });
      }
      return withPrimaryInventory(await this.getForAdmin(product.id));
    });
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.getForAdmin(id);
    const { images, attributes, variants, stock, ...rest } = dto;
    return this.prisma.$transaction(async (tx) => {
      if (images) {
        await tx.productImage.deleteMany({ where: { productId: id } });
        await tx.productImage.createMany({
          data: images.map((img, i) => ({ ...img, productId: id, isPrimary: img.isPrimary ?? i === 0, sortOrder: i })),
        });
      }
      if (attributes) {
        await tx.productAttribute.deleteMany({ where: { productId: id } });
        await tx.productAttribute.createMany({ data: attributes.map((a) => ({ ...a, productId: id })) });
      }
      if (stock !== undefined) {
        const inv = await tx.inventory.findFirst({ where: { productId: id, variantId: null } });
        if (!inv && !variants?.length) {
          await tx.inventory.create({ data: { productId: id, availableStock: stock } });
        }
      }
      const updated = await tx.product.update({
        where: { id },
        data: rest,
        include: { variants: { include: { inventory: true } }, images: true, attributes: true, inventories: true },
      });
      return withPrimaryInventory(updated);
    });
  }

  async getForAdmin(id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, deletedAt: null },
      include: { variants: { include: { inventory: true } }, images: true, attributes: true, inventories: true },
    });
    if (!product) throw new NotFoundException('Product not found');
    return withPrimaryInventory(product);
  }

  /** Soft delete — order history stays intact via snapshots. */
  async remove(id: string) {
    await this.getForAdmin(id);
    await this.prisma.product.update({ where: { id }, data: { deletedAt: new Date(), status: ProductStatus.ARCHIVED } });
    return { message: 'Archived' };
  }

  async restore(id: string) {
    await this.prisma.product.update({ where: { id }, data: { deletedAt: null, status: ProductStatus.PUBLISHED } });
    return { message: 'Restored' };
  }

  async bulkAction(action: 'publish' | 'archive' | 'delete', ids: string[]) {
    if (!ids.length) throw new BadRequestException('No ids provided');
    switch (action) {
      case 'publish':
        await this.prisma.product.updateMany({ where: { id: { in: ids } }, data: { status: ProductStatus.PUBLISHED } });
        break;
      case 'archive':
        await this.prisma.product.updateMany({ where: { id: { in: ids } }, data: { status: ProductStatus.ARCHIVED } });
        break;
      case 'delete':
        await this.prisma.product.updateMany({ where: { id: { in: ids } }, data: { deletedAt: new Date() } });
        break;
    }
    return { message: `${action}: ${ids.length} products` };
  }

  private emptyPage(query: ProductQuery) {
    return { items: [], total: 0, page: query.page, limit: query.limit };
  }

  /** Category itself + all descendants (tree-aware filter). */
  private async resolveCategoryIds(categoryId?: string, categorySlug?: string): Promise<string[]> {
    const root = categoryId
      ? await this.prisma.category.findUnique({ where: { id: categoryId } })
      : await this.prisma.category.findUnique({ where: { slug: categorySlug! } });
    if (!root) return [];

    const all = await this.prisma.category.findMany({ where: { deletedAt: null }, select: { id: true, parentId: true } });
    const childrenOf = new Map<string, string[]>();
    for (const c of all) {
      if (c.parentId) childrenOf.set(c.parentId, [...(childrenOf.get(c.parentId) ?? []), c.id]);
    }
    const ids = [root.id];
    const queue = [root.id];
    while (queue.length) {
      const current = queue.pop()!;
      for (const child of childrenOf.get(current) ?? []) {
        ids.push(child);
        queue.push(child);
      }
    }
    return ids;
  }

  private async assertUnique(slug: string, sku: string) {
    const dupSlug = await this.prisma.product.findUnique({ where: { slug } });
    if (dupSlug) throw new ConflictException(`Slug "${slug}" exists`);
    const dupSku = await this.prisma.product.findUnique({ where: { sku } });
    if (dupSku) throw new ConflictException(`SKU "${sku}" exists`);
  }
}

export interface CreateProductDto {
  sku: string;
  name: string;
  slug?: string;
  shortDescription?: string;
  description?: string;
  categoryId: string;
  brandId?: string | null;
  price: number;
  compareAtPrice?: number | null;
  costPrice?: number | null;
  stock?: number;
  weightGrams?: number | null;
  warrantyMonths?: number | null;
  origin?: string;
  tags?: string[];
  status?: ProductStatus;
  seoTitle?: string;
  seoDescription?: string;
  relatedProductIds?: string[];
  images?: { url: string; alt?: string; isPrimary?: boolean }[];
  attributes?: { name: string; value: string; sortOrder?: number }[];
  variants?: {
    sku: string;
    attributes: Record<string, string>;
    price: number;
    compareAtPrice?: number | null;
    imageUrl?: string;
    stock?: number;
  }[];
}

export type UpdateProductDto = Partial<CreateProductDto>;
