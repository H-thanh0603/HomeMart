'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Flame, Sparkles } from 'lucide-react';
import { useCategories, useProducts } from '@/hooks/use-catalog';
import { ProductGrid } from '@/components/product/product-card';
import { ProductGridSkeleton } from '@/components/ui/skeleton';
import { ErrorState, EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { getCategoryTheme, MOTIFS } from '@/lib/category-themes';
import { cn } from '@/lib/utils';

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
  categoryId,
}: {
  title: string;
  sort: 'best_selling' | 'newest' | 'rating' | 'price_asc';
  limit?: number;
  icon?: React.ReactNode;
  href?: string;
  categoryId?: string;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, refetch } = useProducts({ sort, limit, page, categoryId });
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

const FEATURED_SLUG = process.env.NEXT_PUBLIC_FEATURED_CATEGORY ?? 'nha-bep';

export default function HomePage() {
  const { data: categories } = useCategories();
  const theme = getCategoryTheme(FEATURED_SLUG);
  const Icon = theme.icon;
  const featuredCategory = useMemo(
    () => (categories ?? []).find((c) => c.slug === FEATURED_SLUG),
    [categories],
  );

  return (
    <div>
      {/* Hero — ngách hẹp 4.1: 1 câu duy nhất thay vì dàn 106 sp */}
      <section
        aria-label={theme.title}
        className="relative overflow-hidden rounded-xl text-white shadow-card"
        style={{ background: `linear-gradient(120deg, ${theme.heroGradient[0]}, ${theme.heroGradient[1]} 55%, ${theme.heroGradient[2]})` }}
      >
        <div aria-hidden className="absolute inset-0" style={{ backgroundImage: MOTIFS[theme.motif] }} />
        <div className="relative z-10 px-6 py-10 md:px-12 md:py-14">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide backdrop-blur">
            <Icon className="h-3.5 w-3.5" aria-hidden />
            {theme.kicker}
          </p>
          <h1 className="max-w-2xl text-2xl font-extrabold leading-tight md:text-4xl">{theme.title}</h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/85 md:text-base">{theme.tagline}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={`/danh-muc/${FEATURED_SLUG}`}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-6 text-sm font-semibold shadow-sm transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              style={{ color: theme.accentDeep }}
            >
              Khám phá {theme.name} <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link
              href="/products"
              className="inline-flex h-11 items-center rounded-xl border border-white/40 px-6 text-sm font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              Tất cả sản phẩm
            </Link>
          </div>
          <p className="mt-3 text-xs text-white/60">Gợi ý: đổi ngách qua env `NEXT_PUBLIC_FEATURED_CATEGORY` (hiện: {FEATURED_SLUG})</p>
        </div>
        <div aria-hidden className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
        <div aria-hidden className="absolute -bottom-24 right-32 h-72 w-72 rounded-full bg-white/20 blur-3xl" />
      </section>

      {/* Highlights của ngách */}
      <section aria-label="Vì sao chọn ngách này" className="mt-4 grid gap-3 sm:grid-cols-3">
        {theme.highlights.map((h) => {
          const HIcon = h.icon;
          return (
            <div key={h.title} className="flex items-start gap-3 rounded-xl bg-white p-4 ring-1 ring-slate-100">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: theme.chipBg, color: theme.accentDeep }}>
                <HIcon className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900">{h.title}</h3>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{h.text}</p>
              </div>
            </div>
          );
        })}
      </section>

      {/* Sản phẩm ngách chính — lọc theo categoryId */}
      <ProductSection
        title={`${theme.name} — bán chạy`}
        sort="best_selling"
        limit={8}
        icon={<Sparkles className="h-5 w-5" />}
        href={`/danh-muc/${FEATURED_SLUG}`}
        categoryId={featuredCategory?.id}
      />

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
