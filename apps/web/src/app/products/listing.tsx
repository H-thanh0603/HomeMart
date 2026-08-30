'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import { ChevronRight, Filter, SlidersHorizontal, Sparkles, X } from 'lucide-react';
import {
  useBrands,
  useCategories,
  useProducts,
} from '@/hooks/use-catalog';
import { ProductGrid } from '@/components/product/product-card';
import { ProductGridSkeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/empty-state';
import { Select } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/ui/pagination';
import { cn, formatCurrency } from '@/lib/utils';
import type { CategoryNode } from '@/hooks/use-catalog';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Mới nhất' },
  { value: 'best_selling', label: 'Bán chạy nhất' },
  { value: 'price_asc', label: 'Giá thấp → cao' },
  { value: 'price_desc', label: 'Giá cao → thấp' },
  { value: 'rating', label: 'Đánh giá cao nhất' },
] as const;

const PRICE_RANGES = [
  { label: 'Dưới 100.000₫', min: undefined, max: 100000 },
  { label: '100.000₫ – 300.000₫', min: 100000, max: 300000 },
  { label: '300.000₫ – 700.000₫', min: 300000, max: 700000 },
  { label: '700.000₫ – 1.500.000₫', min: 700000, max: 1500000 },
  { label: 'Trên 1.500.000₫', min: 1500000, max: undefined },
];

const RATING_OPTIONS = [4, 3, 2, 1];

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-slate-100 py-4 last:border-0">
      <h3 className="mb-2.5 text-xs font-bold uppercase tracking-wider text-slate-800">{title}</h3>
      {children}
    </div>
  );
}

function CategoryTree({
  categories,
  activeId,
  onPick,
}: {
  categories: CategoryNode[];
  activeId?: string;
  onPick: (id?: string) => void;
}) {
  return (
    <ul className="space-y-1 text-sm">
      {categories.map((cat) => {
        const isSelected = activeId === cat.id;
        return (
          <li key={cat.id}>
            <button
              onClick={() => onPick(isSelected ? undefined : cat.id)}
              className={cn(
                'flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left font-medium transition-colors',
                isSelected
                  ? 'bg-primary-50 text-primary-700 shadow-sm font-semibold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
              )}
              aria-pressed={isSelected}
            >
              <span>{cat.name}</span>
              {isSelected && <ChevronRight className="h-4 w-4" />}
            </button>
            {cat.children && cat.children.length > 0 && (
              <ul className="ml-3 mt-1 space-y-0.5 border-l-2 border-slate-100 pl-2">
                {cat.children.map((child) => {
                  const isChildSelected = activeId === child.id;
                  return (
                    <li key={child.id}>
                      <button
                        onClick={() => onPick(isChildSelected ? undefined : child.id)}
                        className={cn(
                          'w-full rounded-lg px-2 py-1 text-left text-xs transition-colors',
                          isChildSelected
                            ? 'font-bold text-primary-700 bg-primary-50/70'
                            : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50',
                        )}
                      >
                        {child.name}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function FilterSidebar({
  params,
  update,
}: {
  params: Record<string, string>;
  update: (patch: Record<string, string | undefined>) => void;
}) {
  const { data: categories } = useCategories();
  const { data: brands } = useBrands();
  const [minPrice, setMinPrice] = useState(params.minPrice ?? '');
  const [maxPrice, setMaxPrice] = useState(params.maxPrice ?? '');

  const categoryId = params.categoryId;

  return (
    <aside aria-label="Bộ lọc sản phẩm" className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-slate-100">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
        <Filter className="h-4 w-4 text-emerald-600" />
        <h2 className="text-sm font-bold text-slate-900">Bộ lọc tìm kiếm</h2>
      </div>

      <FilterSection title="Danh mục">
        <CategoryTree
          categories={categories ?? []}
          activeId={categoryId}
          onPick={(id) => update({ categoryId: id })}
        />
      </FilterSection>

      <FilterSection title="Thương hiệu">
        <ul className="max-h-48 space-y-1 overflow-y-auto pr-1 text-sm">
          {(brands ?? []).map((brand) => (
            <li key={brand.id}>
              <label className="flex cursor-pointer items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-slate-50 transition-colors">
                <input
                  type="radio"
                  name="brand"
                  checked={params.brandId === brand.id}
                  onChange={() => update({ brandId: params.brandId === brand.id ? undefined : brand.id })}
                  className="h-4 w-4 accent-emerald-600"
                />
                <span className="text-slate-700 text-xs font-medium">{brand.name}</span>
              </label>
            </li>
          ))}
          {params.brandId && (
            <li className="pt-1">
              <button
                onClick={() => update({ brandId: undefined })}
                className="px-2 py-1 text-xs font-semibold text-red-600 hover:underline"
              >
                Bỏ chọn thương hiệu
              </button>
            </li>
          )}
        </ul>
      </FilterSection>

      <FilterSection title="Khoảng giá">
        <ul className="space-y-1 text-xs">
          {PRICE_RANGES.map((range) => {
            const key = `${range.min ?? ''}-${range.max ?? ''}`;
            const active =
              (params.minPrice ?? '') === String(range.min ?? '') &&
              (params.maxPrice ?? '') === String(range.max ?? '');
            return (
              <li key={key}>
                <label className="flex cursor-pointer items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-slate-50 transition-colors">
                  <input
                    type="radio"
                    name="price-range"
                    checked={active}
                    onChange={() => update({ minPrice: range.min ? String(range.min) : undefined, maxPrice: range.max ? String(range.max) : undefined })}
                    className="h-4 w-4 accent-emerald-600"
                  />
                  <span className="text-slate-700 font-medium">{range.label}</span>
                </label>
              </li>
            );
          })}
        </ul>
        <form
          className="mt-3 flex items-center gap-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            update({
              minPrice: minPrice || undefined,
              maxPrice: maxPrice || undefined,
            });
          }}
        >
          <input
            inputMode="numeric"
            placeholder="Từ ₫"
            aria-label="Giá tối thiểu"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value.replace(/\D/g, ''))}
            className="w-full rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          />
          <span className="text-slate-400">–</span>
          <input
            inputMode="numeric"
            placeholder="Đến ₫"
            aria-label="Giá tối đa"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value.replace(/\D/g, ''))}
            className="w-full rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          />
          <Button size="sm" variant="outline" type="submit" className="shrink-0">
            Lọc
          </Button>
        </form>
      </FilterSection>

      <FilterSection title="Đánh giá sao">
        <ul className="space-y-1 text-xs">
          {RATING_OPTIONS.map((rating) => (
            <li key={rating}>
              <label className="flex cursor-pointer items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-slate-50 transition-colors">
                <input
                  type="radio"
                  name="rating"
                  checked={params.rating === String(rating)}
                  onChange={() =>
                    update({ rating: params.rating === String(rating) ? undefined : String(rating) })
                  }
                  className="h-4 w-4 accent-emerald-600"
                />
                <span className="text-amber-400 tracking-wider" aria-hidden>
                  {'★'.repeat(rating)}
                </span>
                <span className="text-slate-600 font-medium">từ {rating} sao</span>
              </label>
            </li>
          ))}
        </ul>
      </FilterSection>

      <div className="py-3">
        <label className="flex cursor-pointer items-center gap-2.5 text-xs font-semibold text-slate-800">
          <input
            type="checkbox"
            checked={params.inStock === 'true'}
            onChange={(e) => update({ inStock: e.target.checked ? 'true' : undefined })}
            className="h-4 w-4 rounded accent-emerald-600"
          />
          <span>Chỉ xem hàng có sẵn</span>
        </label>
      </div>
    </aside>
  );
}

export function ProductListing() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const params = useMemo(() => {
    const obj: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      if (value) obj[key] = value;
    });
    return obj;
  }, [searchParams]);

  const update = useCallback(
    (patch: Record<string, string | undefined>) => {
      const next = new URLSearchParams(searchParams.toString());
      Object.entries(patch).forEach(([key, value]) => {
        if (value === undefined || value === '') next.delete(key);
        else next.set(key, value);
      });
      if (!('page' in patch)) next.delete('page');
      router.push(`/products?${next.toString()}`, { scroll: true });
    },
    [router, searchParams],
  );

  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1);

  const query = useProducts({
    page,
    limit: 12,
    sort: (params.sort as never) ?? 'newest',
    minPrice: params.minPrice ? Number(params.minPrice) : undefined,
    maxPrice: params.maxPrice ? Number(params.maxPrice) : undefined,
    categoryId: params.categoryId,
    brandId: params.brandId,
    rating: params.rating ? Number(params.rating) : undefined,
    inStock: params.inStock === 'true' ? true : undefined,
    q: params.q,
  });

  const products = query.data?.data ?? [];
  const meta = query.data?.meta;
  const totalPages = meta?.totalPages ?? 1;

  const activeFilters = [
    params.q && { key: 'q', label: `Tìm kiếm: "${params.q}"` },
    params.brandId && { key: 'brandId', label: 'Thương hiệu đã chọn' },
    params.rating && { key: 'rating', label: `≥ ${params.rating}★` },
    params.inStock === 'true' && { key: 'inStock', label: 'Còn hàng' },
    (params.minPrice || params.maxPrice) && {
      key: 'price',
      label:
        params.minPrice && params.maxPrice
          ? `${formatCurrency(Number(params.minPrice))} – ${formatCurrency(Number(params.maxPrice))}`
          : params.minPrice
            ? `Từ ${formatCurrency(Number(params.minPrice))}`
            : `Đến ${formatCurrency(Number(params.maxPrice))}`,
    },
  ].filter(Boolean) as { key: string; label: string }[];

  return (
    <div>
      {/* Top Banner Header */}
      <div className="mb-6 rounded-2xl bg-gradient-to-r from-emerald-800 via-primary-700 to-teal-800 p-6 text-white shadow-md">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-200">
            <Sparkles className="h-4 w-4 text-amber-300" />
            Danh mục sản phẩm
          </div>
          <h1 className="text-2xl font-black md:text-3xl">Tất Cả Sản Phẩm Gia Dụng</h1>
          <p className="text-xs text-emerald-100 md:text-sm">
            Lựa chọn đồ gia dụng chất lượng cao, bảo hành chính hãng cho ngôi nhà của bạn.
          </p>
        </div>
      </div>

      {/* Control Bar: Sorting + Mobile Filter */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-3.5 shadow-card ring-1 ring-slate-100">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="lg:hidden"
            onClick={() => setMobileFiltersOpen(true)}
            aria-expanded={mobileFiltersOpen}
          >
            <SlidersHorizontal className="h-4 w-4 text-emerald-600" /> Bộ lọc
          </Button>
          <p className="text-xs font-semibold text-slate-500 sm:text-sm">
            {meta ? (
              <span>
                Tìm thấy <strong className="text-slate-900">{meta.total.toLocaleString('vi-VN')}</strong> sản phẩm
              </span>
            ) : (
              'Đang tải sản phẩm...'
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="sort" className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Sắp xếp
          </label>
          <Select
            id="sort"
            className="!w-auto !py-1.5 text-xs font-semibold"
            value={params.sort ?? 'newest'}
            onChange={(e) => update({ sort: e.target.value })}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* Active Filter Tags */}
      {activeFilters.length > 0 && (
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-500">Đang lọc theo:</span>
          {activeFilters.map((f) => (
            <span
              key={f.key}
              className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-600/20"
            >
              {f.label}
              <button
                aria-label={`Xoá bộ lọc ${f.label}`}
                onClick={() => {
                  if (f.key === 'price') update({ minPrice: undefined, maxPrice: undefined });
                  else update({ [f.key]: undefined });
                }}
                className="rounded-full p-0.5 hover:bg-emerald-200/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <button
            onClick={() => router.push('/products')}
            className="text-xs font-bold text-red-600 hover:underline ml-1"
          >
            Xoá tất cả
          </button>
        </div>
      )}

      {/* Main Catalog Grid & Sidebar */}
      <div className="flex gap-6">
        <div className="hidden w-64 shrink-0 lg:block">
          <FilterSidebar params={params} update={update} />
        </div>

        <div className="min-w-0 flex-1">
          {query.isLoading ? (
            <ProductGridSkeleton count={12} />
          ) : query.isError ? (
            <ErrorState onRetry={() => query.refetch()} />
          ) : products.length === 0 ? (
            <EmptyState
              title="Không tìm thấy sản phẩm phù hợp"
              description="Thử thay đổi bộ lọc hoặc từ khoá tìm kiếm khác."
              actionLabel="Xoá bộ lọc"
              href="/products"
            />
          ) : (
            <>
              <ProductGrid products={products} />
              <Pagination page={page} totalPages={totalPages} onChange={(p) => update({ page: String(p) })} />
            </>
          )}
        </div>
      </div>

      {/* Mobile Filter Drawer */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label="Bộ lọc sản phẩm">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileFiltersOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 z-10 w-[85%] max-w-sm overflow-y-auto bg-white p-5 shadow-2xl animate-slide-right">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Filter className="h-4 w-4 text-emerald-600" /> Bộ lọc sản phẩm
              </h2>
              <button
                aria-label="Đóng bộ lọc"
                onClick={() => setMobileFiltersOpen(false)}
                className="rounded-xl p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <FilterSidebar
              params={params}
              update={(patch) => {
                update(patch);
                setMobileFiltersOpen(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
