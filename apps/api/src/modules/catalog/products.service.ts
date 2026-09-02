import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'crypto';
import { Prisma, ProductStatus } from 'src/generated/prisma/client';
import { PrismaService } from '../../infra/prisma.service';
import { RedisService } from '../../infra/redis.service';
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
  /**
   * Keyset pagination cursor (base64 "createdAtISO|id") — only used with the
   * default `newest` sort. Deep pages skip the OFFSET scan entirely.
   */
  cursor?: string;
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

/**
 * Slim include for list/card responses — the full include (variants +
 * per-variant inventory + attributes) multiplies row fan-out ~5x per list
 * query and nothing in the product card needs it.
 */
const listInclude = {
  images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] },
  inventories: { where: { variantId: null } },
  category: { select: { id: true, name: true, slug: true } },
  brand: { select: { id: true, name: true, slug: true, logoUrl: true } },
} satisfies Prisma.ProductInclude;

/** Cache version namespace — bumped on any product write, so stale keys are never read. */
const CATALOG_VERSION_KEY = 'catalog:version';
const LIST_CACHE_TTL = 30; // seconds
const DETAIL_CACHE_TTL = 60; // seconds
const NEGATIVE_CACHE_TTL = 10; // seconds — misses for nonexistent slugs
const STAMPEDE_LOCK_TTL_MS = 5000;
const STAMPEDE_WAIT_MS = 1500;
const NULL_MARKER = '__NULL__';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Cache-aside read with stampede protection: on a miss only one caller
   * reloads from the DB while the rest briefly re-poll the cache.
   * Redis down = pass-through (degraded, same as before).
   */
  private async cached<T>(scope: 'list' | 'detail' | 'count', key: string, ttl: number, load: () => Promise<T>): Promise<T> {
    const version = (await this.redis.get(CATALOG_VERSION_KEY)) ?? '0';
    const fullKey = `${scope}:${version}:${key}`;
    const hit = await this.redis.get(fullKey);
    if (hit) {
      if (hit === NULL_MARKER) throw new NotFoundException('Product not found');
      try {
        return JSON.parse(hit) as T;
      } catch {
        /* corrupt entry — fall through to load */
      }
    }

    const lockKey = `lock:${fullKey}`;
    const winner = await this.redis.tryLock(lockKey, STAMPEDE_LOCK_TTL_MS);
    if (!winner) {
      // Someone else is loading — wait for them to populate the cache
      const deadline = Date.now() + STAMPEDE_WAIT_MS;
      while (Date.now() < deadline) {
        await this.redis.sleep(100);
        const repopulated = await this.redis.get(fullKey);
        if (repopulated) {
          if (repopulated === NULL_MARKER) throw new NotFoundException('Product not found');
          try {
            return JSON.parse(repopulated) as T;
          } catch {
            break;
          }
        }
      }
      // Lock holder died or took too long — load ourselves rather than fail
    }

    try {
      const value = await load();
      await this.redis.set(fullKey, JSON.stringify(value), ttl);
      return value;
    } catch (e) {
      // Negative cache: repeated requests for a missing slug hit the DB once
      if (e instanceof NotFoundException) {
        await this.redis.set(fullKey, NULL_MARKER, NEGATIVE_CACHE_TTL);
      }
      throw e;
    } finally {
      if (winner) await this.redis.unlock(lockKey);
    }
  }

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

    // Keyset pagination (newest sort): cursor = base64("createdAtISO|id").
    // Deep pages avoid the OFFSET scan; other sorts keep offset pagination.
    let skip = (query.page - 1) * query.limit;
    let effectiveWhere: Prisma.ProductWhereInput = where;
    if (query.cursor && (query.sort ?? 'newest') === 'newest') {
      try {
        const [createdAtIso, cursorId] = Buffer.from(query.cursor, 'base64').toString('utf8').split('|');
        const cursorDate = new Date(createdAtIso);
        if (!Number.isNaN(cursorDate.getTime()) && cursorId) {
          effectiveWhere = {
            AND: [
              where,
              {
                OR: [
                  { createdAt: { lt: cursorDate } },
                  { createdAt: cursorDate, id: { lt: cursorId } },
                ],
              },
            ],
          };
          skip = 0;
        }
      } catch {
        /* malformed cursor — fall back to offset */
      }
    }

    const items = await this.prisma.product.findMany({
      where: effectiveWhere,
      orderBy,
      skip,
      take: query.limit,
      include: listInclude,
    });

    // count() doubles every request's DB cost — cache it per filter set
    const countKey = `h:${createHash('sha1').update(JSON.stringify(effectiveWhere)).digest('hex')}`;
    const total = await this.cached('count', countKey, LIST_CACHE_TTL, () =>
      this.prisma.product.count({ where: effectiveWhere }),
    );
    return { items: items.map(withPrimaryInventory), total, page: query.page, limit: query.limit };
  }

  async listCached(query: ProductQuery) {
    // Public list only — admin list (status filter) skips cache.
    if (query.status) return this.list(query);
    const key = JSON.stringify(query);
    return this.cached('list', key, LIST_CACHE_TTL, () => this.list(query));
  }

  async findBySlug(slug: string) {
    return this.cached('detail', `slug:${slug}`, DETAIL_CACHE_TTL, async () => {
      const product = await this.prisma.product.findFirst({
        where: { slug, ...publicWhere },
        include: { ...productInclude, reviews: false },
      });
      if (!product) throw new NotFoundException('Product not found');
      return withPrimaryInventory(product);
    });
  }

  async findRelated(productId: string, limit = 8) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Product not found');

    // Explicitly curated first, then same-category fallback
    let items = product.relatedProductIds.length
      ? await this.prisma.product.findMany({
          where: { id: { in: product.relatedProductIds }, ...publicWhere },
          include: listInclude,
        })
      : [];
    if (items.length < limit) {
      const fill = await this.prisma.product.findMany({
        where: { categoryId: product.categoryId, id: { notIn: [productId, ...items.map((i) => i.id)] }, ...publicWhere },
        orderBy: { soldCount: 'desc' },
        take: limit - items.length,
        include: listInclude,
      });
      items = [...items, ...fill];
    }
    return items.map(withPrimaryInventory);
  }

  async suggest(q: string, limit = 8) {
    if (!q?.trim()) return [];
    // Khi MEILISEARCH_URL được set, ưu tiên Meilisearch (nếu có); hiện tại fallback Prisma ILIKE
    // Đã có GIN trigram index (migration 20260827000001_pg_trgm) nên ILIKE vẫn nhanh tới ~10k SKU
    if (process.env.MEILISEARCH_URL) {
      try {
        const res = await fetch(`${process.env.MEILISEARCH_URL}/indexes/products/search`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.MEILISEARCH_KEY ?? ''}`,
          },
          body: JSON.stringify({ q: q.trim(), limit }),
          signal: AbortSignal.timeout(2000),
        });
        if (res.ok) {
          const data = (await res.json()) as { hits?: { id: string; slug: string; name: string; price: number }[] };
          if (data.hits?.length) return data.hits as unknown as ReturnType<typeof this.prisma.product.findMany>;
        }
      } catch { /* fallback Prisma */ }
    }
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
      orderBy: { soldCount: 'desc' },
    });
  }

  // ───────── Admin CRUD ─────────

  async create(dto: CreateProductDto) {
    const slug = dto.slug || slugify(dto.name);
    await this.assertUnique(slug, dto.sku);
    const result = await this.prisma.$transaction(async (tx) => {
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
    await this.bumpCatalogVersion();
    return result;
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.getForAdmin(id);
    const { images, attributes, variants, stock, ...rest } = dto;
    const updated = await this.prisma.$transaction(async (tx) => {
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
    await this.bumpCatalogVersion();
    return updated;
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
    await this.bumpCatalogVersion();
    return { message: 'Archived' };
  }

  async restore(id: string) {
    await this.prisma.product.update({ where: { id }, data: { deletedAt: null, status: ProductStatus.PUBLISHED } });
    await this.bumpCatalogVersion();
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
    await this.bumpCatalogVersion();
    return { message: `${action}: ${ids.length} products` };
  }

  /** (1) Import CSV hàng loạt — header: sku,name,price,categorySlug,stock,weightGrams,description */
  async importCsv(csv: string) {
    const lines = csv.trim().split('\n');
    if (lines.length < 2) throw new BadRequestException('CSV rỗng hoặc thiếu header');
    const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const required = ['sku', 'name', 'price', 'categoryslug'];
    for (const r of required) if (!header.includes(r)) throw new BadRequestException(`Thiếu cột ${r} trong header: ${lines[0]}`);
    const idx = (col: string) => header.indexOf(col);
    // Batch: preload all categories once (1 query instead of 1 per row)
    const categoryBySlug = new Map(
      (await this.prisma.category.findMany({ where: { deletedAt: null }, select: { id: true, slug: true } })).map((c) => [c.slug, c.id]),
    );
    const results: { sku: string; ok: boolean; error?: string; id?: string }[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      // Simple CSV split — không hỗ trợ dấu phẩy trong giá trị (dùng template đơn giản)
      const cols = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
      const sku = cols[idx('sku')] ?? '';
      const name = cols[idx('name')] ?? '';
      const price = Number(cols[idx('price')] ?? 0);
      const categorySlug = cols[idx('categoryslug')] ?? '';
      const stock = Number(cols[idx('stock')] ?? 0);
      const weightGrams = cols[idx('weightgrams')] ? Number(cols[idx('weightgrams')]) : undefined;
      const description = cols[idx('description')] ?? undefined;
      if (!sku || !name || !price || !categorySlug) {
        results.push({ sku: sku || `line${i + 1}`, ok: false, error: 'Thiếu sku/name/price/categorySlug' });
        continue;
      }
      const categoryId = categoryBySlug.get(categorySlug);
      if (!categoryId) {
        results.push({ sku, ok: false, error: `categorySlug "${categorySlug}" không tồn tại` });
        continue;
      }
      try {
        const created = await this.create({
          sku, name, price, categoryId, stock: stock || 0,
          weightGrams, description, status: ProductStatus.PUBLISHED,
        });
        results.push({ sku, ok: true, id: created.id });
      } catch (e) {
        results.push({ sku, ok: false, error: (e as Error).message.slice(0, 200) });
      }
    }
    const success = results.filter((r) => r.ok).length;
    if (success > 0) await this.bumpCatalogVersion();
    return { total: results.length, success, failed: results.length - success, results };
  }

  private emptyPage(query: ProductQuery) {
    return { items: [], total: 0, page: query.page, limit: query.limit };
  }

  /** Invalidate all catalog caches. Cheap: readers fetch version first, old keys orphan and expire by TTL. */
  private async bumpCatalogVersion() {
    await this.redis.bump(CATALOG_VERSION_KEY);
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
