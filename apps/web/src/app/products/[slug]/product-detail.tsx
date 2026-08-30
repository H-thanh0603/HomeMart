'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import {
  Check,
  ChevronRight,
  Heart,
  PackageCheck,
  RotateCcw,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Truck,
  Zap,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import {
  useAddToCart,
  useProduct,
  useProductReviews,
  useRelatedProducts,
  useToggleWishlist,
  useWishlistIds,
} from '@/hooks/use-catalog';
import { Price } from '@/components/product/price';
import { RatingStars } from '@/components/product/rating-stars';
import { ProductGrid } from '@/components/product/product-card';
import { QuantityStepper } from '@/components/ui/quantity-stepper';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton, ListSkeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/empty-state';
import { cn, discountPercent, formatDate } from '@/lib/utils';
import type { Product } from '@/lib/types';
import { toast } from '@/stores/toast-store';

type TabKey = 'description' | 'specs' | 'reviews';

export function ProductDetail({ slug, initial }: { slug: string; initial: Product | null }) {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);

  const query = useProduct(slug);
  const related = useRelatedProducts(slug);
  const addToCart = useAddToCart();
  const toggleWishlist = useToggleWishlist();
  const { ids } = useWishlistIds(Boolean(accessToken));

  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<TabKey>('description');

  const product = query.data ?? initial;

  const [variantId, setVariantId] = useState<string | undefined>(undefined);
  const variants = useMemo(() => product?.variants ?? [], [product]);
  const activeVariant = useMemo(
    () => variants.find((v) => v.id === variantId) ?? null,
    [variants, variantId],
  );
  const [mainImageIdx, setMainImageIdx] = useState(0);

  if (!product) {
    return query.isLoading ? (
      <DetailSkeleton />
    ) : (
      <div className="py-12">
        <ErrorState message="Không tìm thấy sản phẩm" onRetry={() => query.refetch()} />
      </div>
    );
  }

  const price = activeVariant?.price ?? product.price;
  const compareAtPrice = activeVariant?.compareAtPrice ?? product.compareAtPrice;
  const stock = product.inventory?.availableStock ?? activeVariant?.inventory?.availableStock;
  const soldOut = typeof stock === 'number' ? stock <= 0 : false;
  const wishlisted = ids.has(product.id);
  const images = product.images ?? [];

  const requireLogin = (): boolean => {
    if (!accessToken) {
      toast.info('Vui lòng đăng nhập để tiếp tục');
      router.push('/auth/login');
      return false;
    }
    return true;
  };

  const onAddToCart = (buyNow = false) => {
    if (!requireLogin()) return;
    addToCart.mutate(
      { productId: product.id, variantId: variantId || undefined, quantity },
      {
        onSuccess: () => {
          toast.success('Đã thêm vào giỏ hàng');
          if (buyNow) router.push('/checkout');
        },
        onError: (err) => toast.error(err.message),
      },
    );
  };

  const onToggleWishlist = () => {
    if (!requireLogin()) return;
    toggleWishlist.mutate(
      { productId: product.id, wishlisted },
      {
        onSuccess: () =>
          toast.success(wishlisted ? 'Đã bỏ khỏi yêu thích' : 'Đã thêm vào yêu thích'),
        onError: () => toast.error('Không thể cập nhật yêu thích'),
      },
    );
  };

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'description', label: 'Mô tả chi tiết' },
    { key: 'specs', label: 'Thông số kỹ thuật' },
    { key: 'reviews', label: `Đánh giá (${product.reviewCount})` },
  ];

  return (
    <div>
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="mb-4 text-xs font-semibold text-slate-500">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/" className="hover:text-emerald-700">
              Trang chủ
            </Link>
          </li>
          <li><ChevronRight className="h-3 w-3 text-slate-400" /></li>
          <li>
            <Link href="/products" className="hover:text-emerald-700">
              Sản phẩm
            </Link>
          </li>
          {product.category && (
            <>
              <li><ChevronRight className="h-3 w-3 text-slate-400" /></li>
              <li>
                <Link
                  href={`/products?categoryId=${product.category.id}`}
                  className="hover:text-emerald-700"
                >
                  {product.category.name}
                </Link>
              </li>
            </>
          )}
          <li><ChevronRight className="h-3 w-3 text-slate-400" /></li>
          <li aria-current="page" className="truncate font-bold text-slate-800">
            {product.name}
          </li>
        </ol>
      </nav>

      {/* Main Product Info Card */}
      <div className="rounded-3xl bg-white p-5 shadow-card ring-1 ring-slate-100/90 md:p-8">
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
          {/* Gallery Column */}
          <section aria-label="Hình ảnh sản phẩm">
            <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-slate-50 ring-1 ring-slate-100">
              {images[mainImageIdx] || images[0] ? (
                <Image
                  src={(images[mainImageIdx] ?? images[0]).url}
                  alt={product.name}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover transition-transform duration-500 hover:scale-105"
                />
              ) : (
                <div className="flex h-full items-center justify-center bg-slate-100 text-slate-300 font-bold">
                  HomeMart
                </div>
              )}

              {discountPercent(price, compareAtPrice) > 0 && (
                <span className="absolute left-4 top-4 rounded-xl bg-gradient-to-r from-red-600 to-accent-500 px-3 py-1 text-xs font-black text-white shadow-md">
                  Giảm {discountPercent(price, compareAtPrice)}%
                </span>
              )}
            </div>

            {/* Thumbnail Strip */}
            {images.length > 1 && (
              <ul className="mt-4 flex gap-3 overflow-x-auto pb-1" role="listbox" aria-label="Chọn ảnh xem chi tiết">
                {images.map((img, idx) => (
                  <li key={img.id}>
                    <button
                      role="option"
                      aria-selected={idx === mainImageIdx}
                      onClick={() => setMainImageIdx(idx)}
                      className={cn(
                        'h-20 w-20 overflow-hidden rounded-xl border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600',
                        idx === mainImageIdx
                          ? 'border-emerald-600 ring-2 ring-emerald-500/30'
                          : 'border-slate-200 opacity-70 hover:opacity-100 hover:border-slate-300',
                      )}
                      aria-label={`Xem ảnh ${idx + 1}`}
                    >
                      <span className="relative block h-full w-full">
                        <Image src={img.url} alt="" fill sizes="80px" className="object-cover" />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Product Purchase Column */}
          <section aria-label="Thông tin sản phẩm" className="flex flex-col justify-between">
            <div>
              {product.brand && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-700 ring-1 ring-emerald-600/20">
                  <Sparkles className="h-3 w-3" /> Thương hiệu {product.brand.name}
                </span>
              )}

              <h1 className="mt-2.5 text-2xl font-black leading-snug text-slate-900 md:text-3xl">
                {product.name}
              </h1>

              {/* Rating & Sold count */}
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <RatingStars value={product.ratingAvg} count={product.reviewCount} showValue size={16} />
                <span className="text-slate-300">|</span>
                <span className="text-xs font-semibold text-slate-500">
                  Đã bán <strong className="text-slate-800">{product.soldCount.toLocaleString('vi-VN')}</strong>
                </span>
                {typeof stock === 'number' && !soldOut && stock <= 5 && (
                  <Badge tone="warning" dot>
                    Chỉ còn {stock} sản phẩm
                  </Badge>
                )}
              </div>

              {/* Price Tag Container */}
              <div className="mt-5 rounded-2xl bg-gradient-to-r from-emerald-50/80 to-teal-50/60 p-4 ring-1 ring-emerald-100">
                <Price price={price} compareAtPrice={compareAtPrice} size="lg" />
                <p className="mt-1 text-[11px] font-medium text-emerald-800">
                  ✓ Giá đã bao gồm thuế VAT • Miễn phí vận chuyển toàn quốc cho đơn từ 299.000₫
                </p>
              </div>

              {/* Short Specs / Brand meta */}
              {(product.shortDescription || product.origin || product.warrantyMonths) && (
                <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/50 p-3.5 space-y-1.5 text-xs text-slate-600">
                  {product.origin && (
                    <p>
                      Xuất xứ: <strong className="text-slate-800">{product.origin}</strong>
                    </p>
                  )}
                  {product.warrantyMonths ? (
                    <p>
                      Bảo hành chính hãng: <strong className="text-slate-800">{product.warrantyMonths} tháng</strong>
                    </p>
                  ) : null}
                  {product.shortDescription && (
                    <p className="pt-1 text-slate-500 leading-relaxed">{product.shortDescription}</p>
                  )}
                </div>
              )}

              {/* Variants Selector */}
              {variants.length > 0 && (
                <fieldset className="mt-5">
                  <legend className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-800">
                    Phân loại tùy chọn:
                  </legend>
                  <div className="flex flex-wrap gap-2">
                    {variants.map((v) => {
                      const label = Object.entries(v.attributes)
                        .map(([k, val]) => `${k}: ${val}`)
                        .join(', ');
                      const isSelected = variantId === v.id;
                      return (
                        <button
                          key={v.id}
                          onClick={() => setVariantId(v.id)}
                          aria-pressed={isSelected}
                          title={label}
                          className={cn(
                            'rounded-xl px-3.5 py-2 text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600',
                            isSelected
                              ? 'border-2 border-emerald-600 bg-emerald-50 text-emerald-800 shadow-sm'
                              : 'border border-slate-200 bg-white text-slate-700 hover:border-slate-300',
                          )}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              )}

              {/* Quantity Stepper */}
              <div className="mt-5 flex items-center gap-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800">Số lượng:</span>
                <QuantityStepper
                  value={quantity}
                  onChange={setQuantity}
                  max={stock && stock > 0 ? stock : 999}
                  disabled={soldOut}
                />
              </div>
            </div>

            {/* Action Buttons & Guarantees */}
            <div className="mt-8 border-t border-slate-100 pt-6">
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="accent"
                  size="lg"
                  loading={addToCart.isPending}
                  disabled={soldOut}
                  onClick={() => onAddToCart(false)}
                  className="flex-1 sm:flex-none shadow-md shadow-accent-500/20"
                >
                  <ShoppingCart className="mr-1.5 h-5 w-5" /> Thêm vào giỏ
                </Button>
                <Button
                  variant="primary"
                  size="lg"
                  loading={addToCart.isPending}
                  disabled={soldOut}
                  onClick={() => onAddToCart(true)}
                  className="flex-1 sm:flex-none shadow-md shadow-emerald-600/20"
                >
                  <Zap className="mr-1.5 h-5 w-5" /> Mua ngay
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  aria-label={wishlisted ? 'Bỏ khỏi yêu thích' : 'Thêm vào yêu thích'}
                  aria-pressed={wishlisted}
                  onClick={onToggleWishlist}
                  className="!px-3.5"
                >
                  <Heart className={cn('h-5 w-5', wishlisted && 'fill-red-500 text-red-500')} />
                </Button>
              </div>

              {/* Trust Pillars */}
              <ul className="mt-6 grid grid-cols-2 gap-3 text-xs text-slate-600 sm:grid-cols-4">
                <li className="flex items-center gap-2 rounded-xl bg-slate-50 p-2.5">
                  <Truck className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span>Giao toàn quốc</span>
                </li>
                <li className="flex items-center gap-2 rounded-xl bg-slate-50 p-2.5">
                  <RotateCcw className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span>Đổi trả 7 ngày</span>
                </li>
                <li className="flex items-center gap-2 rounded-xl bg-slate-50 p-2.5">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span>100% Chính hãng</span>
                </li>
                <li className="flex items-center gap-2 rounded-xl bg-slate-50 p-2.5">
                  <PackageCheck className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span>Kiểm tra khi nhận</span>
                </li>
              </ul>
            </div>
          </section>
        </div>
      </div>

      {/* Tabs Information Section */}
      <div className="mt-8 rounded-3xl bg-white shadow-card ring-1 ring-slate-100/90 overflow-hidden">
        <div role="tablist" aria-label="Chi tiết sản phẩm" className="flex border-b border-slate-100 bg-slate-50/50">
          {tabs.map((tab) => {
            const isTabActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                role="tab"
                aria-selected={isTabActive}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'whitespace-nowrap px-6 py-4 text-sm font-bold transition-all focus-visible:outline-none',
                  isTabActive
                    ? 'border-b-2 border-emerald-600 bg-white text-emerald-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/50',
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div role="tabpanel" className="p-6 md:p-8">
          {activeTab === 'description' && (
            <div className="prose prose-sm max-w-none text-slate-600 leading-relaxed">
              <p className="whitespace-pre-line text-sm">
                {product.description || product.shortDescription || 'Chưa có mô tả chi tiết cho sản phẩm này.'}
              </p>
            </div>
          )}

          {activeTab === 'specs' && (
            <SpecTable attributes={product.attributes ?? []} />
          )}

          {activeTab === 'reviews' && <ReviewList slug={slug} total={product.reviewCount} />}
        </div>
      </div>

      {/* Related Products Grid */}
      <section aria-label="Sản phẩm liên quan" className="mt-12">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-emerald-600" /> Sản phẩm cùng danh mục
          </h2>
          <Link href="/products" className="text-xs font-bold text-emerald-700 hover:underline">
            Xem tất cả →
          </Link>
        </div>
        {related.isLoading ? (
          <Skeleton className="h-64 w-full rounded-2xl" />
        ) : related.isError ? (
          <ErrorState onRetry={() => related.refetch()} />
        ) : (related.data ?? []).length === 0 ? (
          <EmptyState title="Không có sản phẩm liên quan" />
        ) : (
          <ProductGrid products={(related.data ?? []).slice(0, 8)} />
        )}
      </section>
    </div>
  );
}

function SpecTable({ attributes }: { attributes: { id: string; name: string; value: string }[] }) {
  if (attributes.length === 0)
    return <p className="text-sm text-slate-500">Chưa có thông số kỹ thuật.</p>;
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100">
      <table className="w-full text-sm">
        <tbody>
          {attributes.map((attr, idx) => (
            <tr key={attr.id} className={cn('border-b border-slate-100 last:border-0', idx % 2 === 0 ? 'bg-slate-50/50' : 'bg-white')}>
              <th scope="row" className="w-52 py-3 px-4 text-left font-semibold text-slate-600">
                {attr.name}
              </th>
              <td className="py-3 px-4 text-slate-800 font-medium">{attr.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReviewList({ slug, total }: { slug: string; total: number }) {
  const [page, setPage] = useState(1);
  const query = useProductReviews(slug, page);
  const reviews = query.data?.data ?? [];
  const totalPages = query.data?.meta?.totalPages ?? 1;

  if (query.isLoading || query.isFetching) return <ListSkeleton rows={3} />;
  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />;
  if (reviews.length === 0)
    return (
      <EmptyState
        title="Chưa có đánh giá nào"
        description="Hãy là người đầu tiên mua và chia sẻ trải nghiệm về sản phẩm này!"
      />
    );

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <article key={review.id} className="rounded-2xl border border-slate-100 bg-slate-50/40 p-5">
          <header className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-800">
                {(review.user?.fullName ?? 'K').charAt(0).toUpperCase()}
              </span>
              <div>
                <span className="text-sm font-bold text-slate-800">
                  {review.user?.fullName ?? 'Khách hàng'}
                </span>
                <span className="ml-2 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                  <Check className="h-3 w-3" /> Đã mua hàng
                </span>
              </div>
            </div>
            <time className="text-xs text-slate-400">{formatDate(review.createdAt)}</time>
          </header>
          <RatingStars value={review.rating} size={14} className="mt-2.5" />
          {review.comment && (
            <p className="mt-2.5 text-sm text-slate-700 leading-relaxed">{review.comment}</p>
          )}
        </article>
      ))}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 pt-3">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Trang trước
          </Button>
          <span className="flex h-8 items-center px-3 text-xs font-semibold text-slate-500">
            Trang {page}/{totalPages} · {total} đánh giá
          </span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Trang sau
          </Button>
        </div>
      )}
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <Skeleton className="aspect-square w-full rounded-3xl" />
      <div className="space-y-4">
        <Skeleton className="h-8 w-3/4 rounded-xl" />
        <Skeleton className="h-5 w-1/3 rounded-xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-14 w-full rounded-2xl" />
        <Skeleton className="h-12 w-2/3 rounded-xl" />
      </div>
    </div>
  );
}
