'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronRight, PackageCheck } from 'lucide-react';
import { useCategories, useProducts, type ProductListParams } from '@/hooks/use-catalog';
import { ProductGrid } from '@/components/product/product-card';
import { ProductGridSkeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { getCategoryTheme, MOTIFS, type CategoryTheme } from '@/lib/category-themes';
import { cn } from '@/lib/utils';

const SORT_TABS = [
  { value: 'best_selling', label: 'Bán chạy' },
  { value: 'newest', label: 'Hàng mới' },
  { value: 'rating', label: 'Đánh giá cao' },
  { value: 'price_asc', label: 'Giá thấp → cao' },
] as const;

type SortValue = (typeof SORT_TABS)[number]['value'];

export function CategoryView({ slug }: { slug: string }) {
  const theme = getCategoryTheme(slug);
  const Icon = theme.icon;

  const { data: categories, isLoading: catLoading } = useCategories();
  const category = useMemo(
    () => (categories ?? []).find((c) => c.slug === slug),
    [categories, slug],
  );

  const [sort, setSort] = useState<SortValue>('best_selling');
  const [page, setPage] = useState(1);
  const gridRef = useRef<HTMLDivElement>(null);

  const params: ProductListParams = {
    ...(category ? { categoryId: category.id } : {}),
    sort,
    page,
    limit: 12,
  };
  // Chờ biết categoryId để không fetch nhầm toàn bộ sản phẩm
  const ready = !catLoading;
  const query = useProducts(params, ready);
  const products = query.data?.data ?? [];
  const totalPages = query.data?.meta?.totalPages ?? 1;

  const changePage = (p: number) => {
    setPage(p);
    gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div>
      {/* ─── Hero theo chủ đề không gian ─── */}
      <section
        aria-label={theme.title}
        className="relative overflow-hidden"
        style={{
          background: `linear-gradient(120deg, ${theme.heroGradient[0]}, ${theme.heroGradient[1]} 55%, ${theme.heroGradient[2]})`,
        }}
      >
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            backgroundImage: MOTIFS[theme.motif],
          }}
        />
        <div
          aria-hidden
          className="absolute -right-20 -top-24 h-80 w-80 rounded-full blur-3xl"
          style={{ backgroundColor: theme.heroGradient[2], opacity: 0.25 }}
        />
        <div
          className={cn(
            'relative mx-auto max-w-7xl px-4 py-12 md:py-16',
            theme.darkHero ? 'text-white' : 'text-white',
          )}
        >
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-1 text-xs text-white/70">
            <Link href="/" className="transition-colors hover:text-white">
              Trang chủ
            </Link>
            <ChevronRight className="h-3 w-3" aria-hidden />
            <span className={theme.darkHero ? 'text-white/90' : 'text-white/90'}>{theme.name}</span>
          </nav>

          <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide backdrop-blur">
                <Icon className="h-3.5 w-3.5" aria-hidden />
                {theme.kicker}
              </p>
              <h1 className="text-3xl font-extrabold leading-tight tracking-tight md:text-5xl">
                {theme.title}
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/85 md:text-base">
                {theme.tagline}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href="#san-pham"
                  className="inline-flex h-11 items-center gap-2 rounded-xl px-5 text-sm font-semibold shadow-sm transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  style={{ backgroundColor: '#ffffff', color: theme.accentDeep }}
                >
                  Xem sản phẩm <ArrowRight className="h-4 w-4" aria-hidden />
                </a>
                <Link
                  href="/products"
                  className="inline-flex h-11 items-center rounded-xl border border-white/40 px-5 text-sm font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  Tất cả danh mục
                </Link>
              </div>
            </div>

            {/* Biểu tượng không gian */}
            <div
              aria-hidden
              className="hidden h-36 w-36 shrink-0 items-center justify-center rounded-3xl bg-white/10 backdrop-blur md:flex"
            >
              <Icon className="h-16 w-16 text-white/90" strokeWidth={1.25} />
            </div>
          </div>
        </div>
      </section>

      {/* ─── Danh mục con ─── */}
      {(category?.children?.length ?? 0) > 0 && (
        <section aria-label="Danh mục con" style={{ backgroundColor: theme.wash }}>
          <div className="mx-auto max-w-7xl px-4 py-5">
            <div className="flex flex-wrap gap-2">
              {category!.children!.map((child) => (
                <Link
                  key={child.id}
                  href={`/products?categoryId=${child.id}`}
                  className="rounded-full px-4 py-1.5 text-sm font-medium transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2"
                  style={{ backgroundColor: theme.chipBg, color: theme.chipText }}
                >
                  {child.name}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── Sản phẩm ─── */}
      <section id="san-pham" aria-label={`${theme.name} — sản phẩm`} className="mx-auto max-w-7xl scroll-mt-24 px-4 py-10">
        <div ref={gridRef} className="scroll-mt-24" />

        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 md:text-xl">
            <PackageCheck className="h-5 w-5" style={{ color: theme.accent }} aria-hidden />
            Sản phẩm{category ? ` thuộc ${category.name}` : ''}
            {query.data?.meta ? (
              <span className="text-sm font-normal text-slate-400">
                · {query.data.meta.total.toLocaleString('vi-VN')} kết quả
              </span>
            ) : null}
          </h2>

          <div role="tablist" aria-label="Sắp xếp" className="flex flex-wrap gap-1.5">
            {SORT_TABS.map((tab) => {
              const active = sort === tab.value;
              return (
                <button
                  key={tab.value}
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    setSort(tab.value);
                    setPage(1);
                  }}
                  className={cn(
                    'rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2',
                    active ? 'text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                  )}
                  style={active ? { backgroundColor: theme.accent } : undefined}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {!ready || query.isLoading ? (
          <ProductGridSkeleton count={12} />
        ) : query.isError ? (
          <ErrorState onRetry={() => query.refetch()} />
        ) : products.length === 0 ? (
          <EmptyState
            title="Chưa có sản phẩm trong mục này"
            description="Sản phẩm sẽ sớm được cập nhật — hoặc xem thêm ở trang tất cả sản phẩm."
            actionLabel="Xem tất cả sản phẩm"
            href="/products"
          />
        ) : (
          <>
            <ProductGrid products={products} />
            <Pagination page={page} totalPages={totalPages} onChange={changePage} />
          </>
        )}
      </section>

      {/* ─── Điểm nhấn theo chủ đề ─── */}
      <section
        aria-label="Vì sao mua tại HomeMart"
        className="border-t border-slate-100"
        style={{ backgroundColor: theme.wash }}
      >
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-8 sm:grid-cols-3">
          {theme.highlights.map((h) => {
            const HIcon = h.icon;
            return (
              <div key={h.title} className="flex items-start gap-3 rounded-xl bg-white/70 p-4 ring-1 ring-slate-100">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                  style={{ backgroundColor: theme.chipBg, color: theme.accentDeep }}
                >
                  <HIcon className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{h.title}</h3>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{h.text}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
