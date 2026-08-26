'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, SlidersHorizontal, X } from 'lucide-react';
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
import { cn, formatCurrency } from '@/lib/utils';
import type { CategoryNode } from '@/hooks/use-catalog';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Mới nhất' },
  { value: 'best_selling', label: 'Bán chạy nhất' },
  { value: 'price_asc', label: 'Giá thấp → cao' },
  { value: 'price_desc', label: 'Giá cao → thấp' },
  { value: 'rating', label: 'Đánh giá cao' },
] as const;

const PRICE_RANGES = [
  { label: 'Dưới 100K', min: undefined, max: 100000 },
  { label: '100K – 300K', min: 100000, max: 300000 },
  { label: '300K – 700K', min: 300000, max: 700000 },
  { label: '700K – 1.5tr', min: 700000, max: 1500000 },
  { label: 'Trên 1.5tr', min: 1500000, max: undefined },
];

const RATING_OPTIONS = [4, 3, 2, 1];

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-slate-100 py-4 last:border-0">
      <h3 className="mb-2 text-sm font-semibold text-slate-900">{title}</h3>
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
      {categories.map((cat) => (
        <li key={cat.id}>
          <button
            onClick={() => onPick(activeId === cat.id ? undefined : cat.id)}
            className={cn(
              'w-full rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-primary-50',
              activeId === cat.id ? 'bg-primary-50 font-medium text-primary-700' : 'text-slate-600',
            )}
            aria-pressed={activeId === cat.id}
          >
            {cat.name}
          </button>
          {cat.children && cat.children.length > 0 && (
            <ul className="ml-4 mt-0.5 space-y-0.5 border-l border-slate-200 pl-2">
              {cat.children.map((child) => (
                <li key={child.id}>
                  <button
                    onClick={() => onPick(activeId === child.id ? undefined : child.id)}
                    className={cn(
                      'w-full rounded-lg px-2 py-1 text-left text-[13px] transition-colors hover:bg-primary-50',
                      activeId === child.id
                        ? 'font-medium text-primary-700'
                        : 'text-slate-500',
                    )}
                  >
                    {child.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
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
    <aside aria-label="Bộ lọc sản phẩm" className="rounded-xl bg-white p-4 shadow-card ring-1 ring-slate-100">
      <FilterSection title="Danh mục">
        <CategoryTree
          categories={categories ?? []}
          activeId={categoryId}
          onPick={(id) => update({ categoryId: id })}
        />
      </FilterSection>

      <FilterSection title="Thương hiệu">
        <ul className="max-h-44 space-y-1 overflow-y-auto text-sm">
          {(brands ?? []).map((brand) => (
            <li key={brand.id}>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 hover:bg-primary-50">
                <input
                  type="radio"
                  name="brand"
                  checked={params.brandId === brand.id}
                  onChange={() => update({ brandId: params.brandId === brand.id ? undefined : brand.id })}
                  className="h-4 w-4 accent-emerald-600"
                />
                <span className="text-slate-600">{brand.name}</span>
              </label>
            </li>
          ))}
          {params.brandId && (
            <li>
              <button
                onClick={() => update({ brandId: undefined })}
                className="px-2 py-1 text-xs font-medium text-red-600 hover:underline"
              >
                Bỏ chọn thương hiệu
              </button>
            </li>
          )}
        </ul>
      </FilterSection>

      <FilterSection title="Khoảng giá">
        <ul className="space-y-1 text-sm">
          {PRICE_RANGES.map((range) => {
            const key = `${range.min ?? ''}-${range.max ?? ''}`;
            const active =
              (params.minPrice ?? '') === String(range.min ?? '') &&
              (params.maxPrice ?? '') === String(range.max ?? '');
            return (
              <li key={key}>
                <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 hover:bg-primary-50">
                  <input
                    type="radio"
                    name="price-range"
                    checked={active}
                    onChange={() => update({ minPrice: range.min ? String(range.min) : undefined, maxPrice: range.max ? String(range.max) : undefined })}
                    className="h-4 w-4 accent-emerald-600"
                  />
                  <span className="text-slate-600">{range.label}</span>
                </label>
              </li>
            );
          })}
        </ul>
        <form
          className="mt-3 flex items-center gap-2"
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
            placeholder="Từ"
            aria-label="Giá tối thiểu"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value.replace(/\D/g, ''))}
            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/40"
          />
          <span className="text-slate-400">–</span>
          <input
            inputMode="numeric"
            placeholder="Đến"
            aria-label="Giá tối đa"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value.replace(/\D/g, ''))}
            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/40"
          />
          <Button size="sm" variant="outline" type="submit" className="shrink-0">
            Áp dụng
          </Button>
        </form>
      </FilterSection>

      <FilterSection title="Đánh giá">
        <ul className="space-y-1 text-sm">
          {RATING_OPTIONS.map((rating) => (
            <li key={rating}>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 hover:bg-primary-50">
                <input
                  type="radio"
                  name="rating"
                  checked={params.rating === String(rating)}
                  onChange={() =>
                    update({ rating: params.rating === String(rating) ? undefined : String(rating) })
                  }
                  className="h-4 w-4 accent-emerald-600"
                />
                <span className="text-amber-400" aria-hidden>
                  {'★'.repeat(rating)}
                </span>
                <span className="text-slate-500">từ {rating} sao</span>
              </label>
            </li>
          ))}
        </ul>
      </FilterSection>

      <div className="py-4">
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={params.inStock === 'true'}
            onChange={(e) => update({ inStock: e.target.checked ? 'true' : undefined })}
            className="h-4 w-4 rounded accent-emerald-600"
          />
          <span className="font-medium text-slate-700">Chỉ hàng có sẵn</span>
        </label>
      </div>
    </aside>
  );
}

function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
  if (totalPages <= 1) return null;
  const arr: number[] = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, start + 4);
  for (let i = start; i <= end; i++) arr.push(i);
  const pages = arr;

  const navBtn =
    'flex h-9 items-center justify-center gap-1 rounded-xl px-3 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-40';

  return (
    <nav aria-label="Phân trang" className="mt-6 flex flex-wrap items-center justify-center gap-1.5">
      <button
        className={cn(navBtn, 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50')}
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        aria-label="Trang trước"
      >
        <ChevronLeft className="h-4 w-4" /> Trước
      </button>
      {pages[0] > 1 && <span className="px-1 text-slate-400">…</span>}
      {pages.map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          aria-current={p === page ? 'page' : undefined}
          className={cn(
            navBtn,
            'min-w-[36px]',
            p === page
              ? 'bg-primary-600 text-white shadow-sm'
              : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
          )}
        >
          {p}
        </button>
      ))}
      {pages[pages.length - 1] < totalPages && <span className="px-1 text-slate-400">…</span>}
      <button
        className={cn(navBtn, 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50')}
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        aria-label="Trang sau"
      >
        Sau <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
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
      if (!('page' in patch)) next.delete('page'); // đổi filter → về trang 1
      router.push(`/products?${next.toString()}`, { scroll: true });
    },
    [router, searchParams],
  );

  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1);
  const sort = (params.sort as 'newest' | undefined) ?? 'newest';

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
    params.q && { key: 'q', label: `"${params.q}"` },
    params.brandId && { key: 'brandId', label: 'Thương hiệu' },
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
      {/* Thanh công cụ: sắp xếp + mở filter mobile */}
      <div className="mb-4 flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="lg:hidden"
          onClick={() => setMobileFiltersOpen(true)}
          aria-expanded={mobileFiltersOpen}
        >
          <SlidersHorizontal className="h-4 w-4" /> Bộ lọc
        </Button>
        <p className="hidden text-sm text-slate-500 sm:block">
          {meta ? `${meta.total.toLocaleString('vi-VN')} sản phẩm` : ''}
        </p>
        <div className="ml-auto flex items-center gap-2">
          <label htmlFor="sort" className="text-sm text-slate-500">
            Sắp xếp
          </label>
          <Select
            id="sort"
            className="!w-auto"
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

      {/* Filter tags đang bật */}
      {activeFilters.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {activeFilters.map((f) => (
            <span
              key={f.key}
              className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700"
            >
              {f.label}
              <button
                aria-label={`Xoá bộ lọc ${f.label}`}
                onClick={() => {
                  if (f.key === 'price') update({ minPrice: undefined, maxPrice: undefined });
                  else update({ [f.key]: undefined });
                }}
                className="rounded-full p-0.5 hover:bg-primary-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <button
            onClick={() => router.push('/products')}
            className="text-xs font-medium text-red-600 hover:underline"
          >
            Xoá tất cả
          </button>
        </div>
      )}

      <div className="flex gap-5">
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

      {/* Mobile filter drawer */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-[55] lg:hidden" role="dialog" aria-modal="true" aria-label="Bộ lọc">
          <button
            aria-label="Đóng bộ lọc"
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => setMobileFiltersOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 z-10 w-[85%] max-w-sm overflow-y-auto bg-white p-4 shadow-card-hover">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-base font-bold">Bộ lọc</h2>
              <button
                aria-label="Đóng"
                onClick={() => setMobileFiltersOpen(false)}
                className="rounded-lg p-1 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600"
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
