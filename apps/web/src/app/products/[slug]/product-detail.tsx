'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import {
  Heart,
  PackageCheck,
  RotateCcw,
  ShieldCheck,
  ShoppingCart,
  Truck,
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

  // Dùng dữ liệu server-rendered trước, sau đó cập nhật từ react-query
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
      <div className="py-10">
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
    { key: 'description', label: 'Mô tả sản phẩm' },
    { key: 'specs', label: 'Thông số' },
    { key: 'reviews', label: `Đánh giá (${product.reviewCount})` },
  ];

  return (
    <div>
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-3 text-sm text-slate-500">
        <ol className="flex flex-wrap items-center gap-1">
          <li><Link href="/" className="hover:text-primary-700">Trang chủ</Link></li>
          <li aria-hidden>/</li>
          <li><Link href="/products" className="hover:text-primary-700">Sản phẩm</Link></li>
          {product.category && (
            <>
              <li aria-hidden>/</li>
              <li>
                <Link href={`/products?categoryId=${product.category.id}`} className="hover:text-primary-700">
                  {product.category.name}
                </Link>
              </li>
            </>
          )}
          <li aria-hidden>/</li>
          <li aria-current="page" className="truncate font-medium text-slate-700">{product.name}</li>
        </ol>
      </nav>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Gallery */}
        <section aria-label="Hình ảnh sản phẩm">
          <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-slate-50 ring-1 ring-slate-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {images[mainImageIdx] || images[0] ? (
              <img
                src={(images[mainImageIdx] ?? images[0]).url}
                alt={product.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-slate-300">HomeMart</div>
            )}
            {discountPercent(price, compareAtPrice) > 0 && (
              <span className="absolute left-3 top-3 rounded-full bg-accent-500 px-2.5 py-1 text-xs font-bold text-white shadow-sm">
                -{discountPercent(price, compareAtPrice)}%
              </span>
            )}
          </div>
          {images.length > 1 && (
            <ul className="mt-3 flex gap-2 overflow-x-auto pb-1" role="listbox" aria-label="Chọn ảnh xem chi tiết">
              {images.map((img, idx) => (
                <li key={img.id}>
                  <button
                    role="option"
                    aria-selected={idx === mainImageIdx}
                    onClick={() => setMainImageIdx(idx)}
                    className={cn(
                      'h-16 w-16 overflow-hidden rounded-lg border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600',
                      idx === mainImageIdx ? 'border-primary-600' : 'border-transparent hover:border-slate-300',
                    )}
                    aria-label={`Xem ảnh ${idx + 1}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url} alt="" className="h-full w-full object-cover" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Thông tin mua hàng */}
        <section aria-label="Thông tin sản phẩm">
          <h1 className="text-xl font-bold leading-snug text-slate-900 md:text-2xl">{product.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <RatingStars value={product.ratingAvg} count={product.reviewCount} showValue size={16} />
            <span className="text-sm text-slate-400">· Đã bán {product.soldCount.toLocaleString('vi-VN')}</span>
            {typeof stock === 'number' && !soldOut && stock <= 5 && (
              <Badge tone="warning">Chỉ còn {stock} sản phẩm</Badge>
            )}
          </div>

          <div className="mt-4 rounded-xl bg-primary-50/60 px-4 py-3">
            <Price price={price} compareAtPrice={compareAtPrice} size="lg" />
          </div>

          {(product.shortDescription || product.brand) && (
            <div className="mt-3 space-y-1 text-sm text-slate-600">
              {product.brand && (
                <p>
                  Thương hiệu:{' '}
                  <span className="font-medium text-slate-800">{product.brand.name}</span>
                </p>
              )}
              {product.origin && <p>Xuất xứ: {product.origin}</p>}
              {product.warrantyMonths ? <p>Bảo hành: {product.warrantyMonths} tháng</p> : null}
            </div>
          )}

          {variants.length > 0 && (
            <fieldset className="mt-4">
              <legend className="mb-2 text-sm font-semibold text-slate-900">Phân loại</legend>
              <div className="flex flex-wrap gap-2">
                {variants.map((v) => {
                  const label = Object.entries(v.attributes)
                    .map(([k, val]) => `${k}: ${val}`)
                    .join(', ');
                  return (
                    <button
                      key={v.id}
                      onClick={() => setVariantId(v.id)}
                      aria-pressed={variantId === v.id}
                      title={label}
                      className={cn(
                        'rounded-xl border px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600',
                        variantId === v.id
                          ? 'border-primary-600 bg-primary-50 font-medium text-primary-700'
                          : 'border-slate-300 bg-white text-slate-600 hover:border-primary-400',
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}

          <div className="mt-4">
            <p className="mb-2 text-sm font-semibold text-slate-900">Số lượng</p>
            <QuantityStepper value={quantity} onChange={setQuantity} max={stock && stock > 0 ? stock : 999} disabled={soldOut} />
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Button
              variant="accent"
              size="lg"
              loading={addToCart.isPending}
              disabled={soldOut}
              onClick={() => onAddToCart(false)}
              className="flex-1 sm:flex-none"
            >
              <ShoppingCart className="mr-1 h-5 w-5" /> Thêm vào giỏ
            </Button>
            <Button
              variant="primary"
              size="lg"
              loading={addToCart.isPending}
              disabled={soldOut}
              onClick={() => onAddToCart(true)}
              className="flex-1 sm:flex-none"
            >
              Mua ngay
            </Button>
            <Button
              variant="outline"
              size="lg"
              aria-label={wishlisted ? 'Bỏ khỏi yêu thích' : 'Thêm vào yêu thích'}
              aria-pressed={wishlisted}
              onClick={onToggleWishlist}
              className="!px-3"
            >
              <Heart className={cn('h-5 w-5', wishlisted && 'fill-red-500 text-red-500')} />
            </Button>
          </div>

          <ul className="mt-5 grid grid-cols-2 gap-2 text-xs text-slate-500 sm:text-sm">
            <li className="flex items-center gap-2"><Truck className="h-4 w-4 text-primary-600" /> Giao hàng toàn quốc</li>
            <li className="flex items-center gap-2"><RotateCcw className="h-4 w-4 text-primary-600" /> Đổi trả trong 7 ngày</li>
            <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary-600" /> Hàng chính hãng</li>
            <li className="flex items-center gap-2"><PackageCheck className="h-4 w-4 text-primary-600" /> Kiểm tra khi nhận hàng</li>
          </ul>
        </section>
      </div>

      {/* Tabs */}
      <div className="mt-8 rounded-xl bg-white shadow-card ring-1 ring-slate-100">
        <div role="tablist" aria-label="Chi tiết sản phẩm" className="flex overflow-x-auto border-b border-slate-100">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              role="tab"
              aria-selected={activeTab === tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-600',
                activeTab === tab.key
                  ? 'border-b-2 border-primary-600 text-primary-700'
                  : 'text-slate-500 hover:text-slate-700',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div role="tabpanel" className="px-4 py-4 md:px-6">
          {activeTab === 'description' && (
            <div className="prose prose-sm max-w-none text-slate-600">
              <p className="whitespace-pre-line">{product.description || product.shortDescription || 'Chưa có mô tả cho sản phẩm này.'}</p>
            </div>
          )}

          {activeTab === 'specs' && (
            <SpecTable attributes={product.attributes ?? []} />
          )}

          {activeTab === 'reviews' && <ReviewList slug={slug} total={product.reviewCount} />}
        </div>
      </div>

      {/* Related products */}
      <section aria-label="Sản phẩm liên quan" className="mt-8">
        <h2 className="mb-3 text-lg font-bold text-slate-900">Sản phẩm liên quan</h2>
        {related.isLoading ? (
          <Skeleton className="h-64 w-full" />
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
    <table className="w-full text-sm">
      <tbody>
        {attributes.map((attr) => (
          <tr key={attr.id} className="border-b border-slate-100 last:border-0">
            <th scope="row" className="w-44 py-2 pr-4 text-left font-medium text-slate-500">
              {attr.name}
            </th>
            <td className="py-2 text-slate-700">{attr.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
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
        description="Hãy là người đầu tiên đánh giá sản phẩm này sau khi mua."
      />
    );

  return (
    <div className="space-y-4">
      {reviews.map((review) => (        <article key={review.id} className="rounded-xl border border-slate-100 p-4">
          <header className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700">
                {(review.user?.fullName ?? 'K').charAt(0).toUpperCase()}
              </span>
              <span className="text-sm font-medium text-slate-700">
                {review.user?.fullName ?? 'Khách hàng'}
              </span>
            </div>
            <time className="text-xs text-slate-400">{formatDate(review.createdAt)}</time>
          </header>
          <RatingStars value={review.rating} size={13} className="mt-2" />
          {review.comment && <p className="mt-2 text-sm text-slate-600">{review.comment}</p>}
        </article>
      ))}

      {totalPages > 1 && (
        <div className="flex justify-center gap-1 pt-1">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Trang trước
          </Button>
          <span className="flex h-8 items-center px-3 text-sm text-slate-500">
            {page}/{totalPages} · {total} đánh giá
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
    <div className="grid gap-6 lg:grid-cols-2">
      <Skeleton className="aspect-square w-full" />
      <div className="space-y-3">
        <Skeleton className="h-7 w-3/4" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-2/3" />
      </div>
    </div>
  );
}
