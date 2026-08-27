'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { Flame, Sparkles } from 'lucide-react';
import { useCategories, useProducts } from '@/hooks/use-catalog';
import { ProductGrid } from '@/components/product/product-card';
import { ProductGridSkeleton } from '@/components/ui/skeleton';
import { ErrorState, EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';

function SectionHeader({
  icon,
  title,
  href,
}: {
  icon?: React.ReactNode;
  title: string;
  href?: string;
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 md:text-xl">
        {icon && <span className="text-accent-500">{icon}</span>}
        {title}
      </h2>
      {href && (
        <Link
          href={href}
          className="text-sm font-medium text-primary-700 transition-colors hover:text-primary-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 rounded-lg"
        >
          Xem tất cả →
        </Link>
      )}
    </div>
  );
}

function ProductSection({
  title,
  sort,
  limit = 8,
  icon,
  href,
}: {
  title: string;
  sort: 'best_selling' | 'newest' | 'rating' | 'price_asc';
  limit?: number;
  icon?: React.ReactNode;
  href?: string;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, refetch } = useProducts({ sort, limit, page });
  const products = data?.data ?? [];
  const totalPages = data?.meta?.totalPages ?? 1;

  const changePage = (p: number) => {
    setPage(p);
    sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <section ref={sectionRef} aria-label={title} className="mt-8 scroll-mt-20">
      <SectionHeader icon={icon} title={title} href={href ?? `/products?sort=${sort}`} />
      {isLoading ? (
        <ProductGridSkeleton count={limit} />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : products.length === 0 ? (
        <EmptyState title="Chưa có sản phẩm" description="Sản phẩm sẽ sớm được cập nhật." />
      ) : (
        <>
          <ProductGrid products={products} />
          <Pagination page={page} totalPages={totalPages} onChange={changePage} />
        </>
      )}
    </section>
  );
}

function CategoryGrid() {
  const { data, isLoading, isError, refetch } = useCategories();

  return (
    <section aria-label="Danh mục nổi bật" className="mt-8">
      <SectionHeader title="Danh mục nổi bật" href="/products" />
      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-slate-200/70" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (data ?? []).length === 0 ? (
        <EmptyState title="Chưa có danh mục" />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {(data ?? []).slice(0, 12).map((cat) => (
            <Link
              key={cat.id}
              href={cat.parentId == null ? `/danh-muc/${cat.slug}` : `/products?categoryId=${cat.id}`}
              className="group flex flex-col items-center gap-2 rounded-xl bg-white p-4 shadow-card ring-1 ring-slate-100 transition-shadow hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600"
            >
              <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-primary-50 text-primary-700">
                {cat.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={cat.imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <span className="text-xl font-bold">{cat.name.charAt(0)}</span>
                )}
              </div>
              <span className="line-clamp-2 text-center text-xs font-medium text-slate-600 group-hover:text-primary-700 sm:text-sm">
                {cat.name}
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

export default function HomePage() {
  return (
    <div>
      {/* Hero banner */}
      <section
        aria-label="Khuyến mãi nổi bật"
        className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary-700 via-primary-600 to-emerald-400 px-6 py-10 text-white shadow-card md:px-12 md:py-16"
      >
        <div className="relative z-10 max-w-xl">
          <p className="mb-2 inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide backdrop-blur">
            Ưu đãi tháng này
          </p>
          <h1 className="text-2xl font-extrabold leading-tight md:text-4xl">
            Mọi thứ cho tổ ấm của bạn
          </h1>
          <p className="mt-2 text-sm text-emerald-50 md:text-base">
            Đồ gia dụng, nhà bếp & nội thất chính hãng — giảm đến 50%, freeship đơn từ 500K.
          </p>
          <Link
            href="/products?sort=best_selling"
            className="mt-5 inline-flex h-11 items-center rounded-xl bg-accent-500 px-6 text-sm font-semibold shadow-sm transition-colors hover:bg-accent-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            Mua sắm ngay
          </Link>
        </div>
        <div
          aria-hidden
          className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl"
        />
        <div
          aria-hidden
          className="absolute -bottom-24 right-32 h-72 w-72 rounded-full bg-accent-400/20 blur-3xl"
        />
      </section>

      <CategoryGrid />

      {/* Flash sale strip */}
      <section aria-label="Flash sale hôm nay" className="mt-8 rounded-xl bg-gradient-to-l from-accent-500 to-red-500 p-px">
        <div className="rounded-xl bg-white px-4 py-3 md:flex md:items-center">
          <div className="flex items-center gap-2 md:w-48 md:shrink-0">
            <Flame className="h-6 w-6 text-accent-500" aria-hidden />
            <div>
              <h2 className="text-base font-bold text-accent-600">FLASH SALE</h2>
              <p className="text-xs text-slate-400">Giá sốc mỗi ngày • 00h – 12h</p>
            </div>
          </div>
          <div className="mt-3 flex-1 md:mt-0 md:pl-4">
            <FlashSaleProducts />
          </div>
        </div>
      </section>

      <ProductSection
        title="Bán chạy nhất"
        sort="best_selling"
        icon={<Sparkles className="h-5 w-5" />}
        href="/products?sort=best_selling"
      />

      <ProductSection title="Hàng mới về" sort="newest" href="/products?sort=newest" />

      <ProductSection title="Được đánh giá cao" sort="rating" href="/products?sort=rating" />
    </div>
  );
}

function FlashSaleProducts() {
  const { data, isLoading, isError, refetch } = useProducts({
    sort: 'best_selling',
    limit: 4,
  });
  const products = (data?.data ?? []).filter(
    (p) => p.compareAtPrice && p.compareAtPrice > p.price,
  );

  if (isLoading) {
    return (
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 w-28 shrink-0 animate-pulse rounded-xl bg-slate-200/70" />
        ))}
      </div>
    );
  }

  if (isError) return <ErrorState onRetry={() => refetch()} />;

  if (products.length === 0)
    return <EmptyState title="Chưa có ưu đãi nào" description="Quay lại sau nhé!" />;

  return (
    <ul className="flex gap-3 overflow-x-auto pb-1">
      {products.slice(0, 6).map((p) => {
        const image = p.images?.find((img) => img.isPrimary) ?? p.images?.[0];
        const percent = Math.round(((p.compareAtPrice! - p.price) / p.compareAtPrice!) * 100);
        return (
          <li key={p.id}>
            <Link
              href={`/products/${p.slug}`}
              className="block w-24 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 rounded-xl"
              aria-label={`${p.name} — giảm ${percent}%`}
            >
              <div className="relative aspect-square w-24 overflow-hidden rounded-xl bg-slate-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {image && <img src={image.url} alt={p.name} loading="lazy" className="h-full w-full object-cover" />}
                <span className="absolute right-0 top-0 rounded-bl-lg bg-accent-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  -{percent}%
                </span>
              </div>
              <p className="mt-1 truncate text-xs font-semibold text-accent-600">
                {new Intl.NumberFormat('vi-VN').format(p.price)}₫
              </p>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
