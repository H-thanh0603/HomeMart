'use client';

import { KitchenCategoryView } from '@/components/category-views/kitchen-view';
import { AppliancesCategoryView } from '@/components/category-views/appliances-view';
import { ToolsCategoryView } from '@/components/category-views/tools-view';
import { CleaningCategoryView } from '@/components/category-views/cleaning-view';
import { FurnitureCategoryView } from '@/components/category-views/furniture-view';
import { SmartHomeCategoryView } from '@/components/category-views/smarthome-view';
import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronRight, PackageCheck, Sparkles } from 'lucide-react';
import { useCategories, useProducts, type ProductListParams } from '@/hooks/use-catalog';
import { ProductGrid } from '@/components/product/product-card';
import { ProductGridSkeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { getCategoryTheme, MOTIFS } from '@/lib/category-themes';
import { cn } from '@/lib/utils';

export function CategoryView({ slug }: { slug: string }) {
  // Điều hướng render tới từng component chuyên biệt với thiết kế và bố cục hoàn toàn độc lập
  if (slug === 'nha-bep') {
    return <KitchenCategoryView slug={slug} />;
  }

  if (slug === 'dien-gia-dung') {
    return <AppliancesCategoryView slug={slug} />;
  }

  if (slug === 'dung-cu-sua-chua') {
    return <ToolsCategoryView slug={slug} />;
  }

  if (slug === 've-sinh-nha-cua') {
    return <CleaningCategoryView slug={slug} />;
  }

  if (slug === 'noi-that-nho') {
    return <FurnitureCategoryView slug={slug} />;
  }

  if (slug === 'nha-thong-minh') {
    return <SmartHomeCategoryView slug={slug} />;
  }

  // Fallback cho danh mục thông thường
  return <DefaultCategoryView slug={slug} />;
}

const SORT_TABS = [
  { value: 'best_selling', label: 'Bán chạy nhất' },
  { value: 'newest', label: 'Hàng mới về' },
  { value: 'rating', label: 'Đánh giá cao' },
  { value: 'price_asc', label: 'Giá thấp → cao' },
  { value: 'price_desc', label: 'Giá cao → thấp' },
] as const;

type SortValue = (typeof SORT_TABS)[number]['value'];

function DefaultCategoryView({ slug }: { slug: string }) {
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
  const ready = !catLoading;
  const query = useProducts(params, ready);
  const products = query.data?.data ?? [];
  const totalPages = query.data?.meta?.totalPages ?? 1;

  const changePage = (p: number) => {
    setPage(p);
    gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="space-y-10">
      <section
        aria-label={theme.title}
        className="relative overflow-hidden rounded-3xl text-white shadow-elevated"
        style={{
          background: `linear-gradient(135deg, ${theme.heroGradient[0]}, ${theme.heroGradient[1]} 55%, ${theme.heroGradient[2]})`,
        }}
      >
        <div
          aria-hidden
          className="absolute inset-0 opacity-15"
          style={{ backgroundImage: MOTIFS[theme.motif] }}
        />
        <div className="relative mx-auto max-w-7xl px-6 py-12 md:py-16">
          <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-1.5 text-xs text-white/80 font-medium">
            <Link href="/" className="transition-colors hover:text-white">
              Trang chủ
            </Link>
            <ChevronRight className="h-3 w-3" />
            <Link href="/products" className="transition-colors hover:text-white">
              Danh mục
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span className="font-bold text-white">{theme.name}</span>
          </nav>

          <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/20 px-3.5 py-1 text-xs font-bold uppercase tracking-wider backdrop-blur-md">
                <Icon className="h-4 w-4 text-amber-300" />
                {theme.kicker}
              </p>
              <h1 className="text-3xl font-black leading-tight tracking-tight md:text-5xl text-balance">
                {theme.title}
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/90 md:text-base">
                {theme.tagline}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href="#san-pham"
                  className="inline-flex h-12 items-center gap-2 rounded-xl bg-white px-6 text-sm font-bold shadow-lg shadow-black/10 transition-transform hover:-translate-y-0.5"
                  style={{ color: theme.accentDeep }}
                >
                  Xem sản phẩm <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            </div>

            <div
              aria-hidden
              className="hidden h-36 w-36 shrink-0 items-center justify-center rounded-3xl bg-white/15 backdrop-blur-md md:flex shadow-inner"
            >
              <Icon className="h-16 w-16 text-white" strokeWidth={1.5} />
            </div>
          </div>
        </div>
      </section>

      {/* Danh mục con */}
      {(category?.children?.length ?? 0) > 0 && (
        <section aria-label="Danh mục con" className="rounded-2xl p-4 shadow-card ring-1 ring-slate-100" style={{ backgroundColor: theme.wash }}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 mr-2">Nhóm:</span>
            {category!.children!.map((child) => (
              <Link
                key={child.id}
                href={`/products?categoryId=${child.id}`}
                className="rounded-xl px-4 py-2 text-xs font-bold transition-transform hover:-translate-y-0.5 shadow-sm"
                style={{ backgroundColor: theme.chipBg, color: theme.chipText }}
              >
                {child.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Sản phẩm */}
      <section id="san-pham" aria-label={`${theme.name} — sản phẩm`} className="scroll-mt-24 pt-4">
        <div ref={gridRef} className="scroll-mt-24" />

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-black text-slate-900 md:text-2xl">
              <PackageCheck className="h-6 w-6" style={{ color: theme.accent }} />
              Sản phẩm {theme.name}
            </h2>
            {query.data?.meta && (
              <p className="mt-0.5 text-xs text-slate-400">
                Hiển thị {query.data.meta.total.toLocaleString('vi-VN')} sản phẩm chất lượng
              </p>
            )}
          </div>

          <div role="tablist" aria-label="Sắp xếp" className="flex flex-wrap gap-2">
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
                    'rounded-xl px-4 py-2 text-xs font-bold transition-all',
                    active
                      ? 'text-white shadow-md'
                      : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200',
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
            description="Sản phẩm sẽ sớm được cập nhật thêm."
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
    </div>
  );
}
