'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Search } from 'lucide-react';
import {
  useAdminCategories,
  useAdminProductMutation,
  useAdminProducts,
  useImportProducts,
} from '@/hooks/use-admin';
import { useAuthStore } from '@/stores/auth-store';
import { toast } from '@/stores/toast-store';
import { friendlyAdminError } from '@/lib/admin-helpers';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { AdminCategory, AdminProduct } from '@/lib/admin-types';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { FilterChips } from '@/components/admin/filter-chips';
import { useSlashFocus } from '@/components/admin/use-slash-focus';
import { normalizeProductSort } from '@/lib/admin-helpers';
import { DialogLite } from '@/components/ui/dialog-lite';
import { EmptyState, ErrorState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { Skeleton } from '@/components/ui/skeleton';

const STATUS_OPTIONS = ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const;
const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Nháp',
  PUBLISHED: 'Đang bán',
  ARCHIVED: 'Đã ẩn',
};

const BULK_ACTIONS = [
  { value: 'publish', label: 'Mở bán' },
  { value: 'archive', label: 'Ẩn' },
  { value: 'delete', label: 'Xóa' },
] as const;

export default function AdminProductsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const isManager = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const status = searchParams.get('status') ?? '';
  const q = searchParams.get('q') ?? '';
  // Whitelist sort từ URL — backend IsIn nên giá trị lạ sẽ 400 (logic có test).
  const sort = normalizeProductSort(searchParams.get('sort'));
  const page = Number(searchParams.get('page') ?? '1') || 1;

  const [searchInput, setSearchInput] = useState(q);
  const searchRef = useRef<HTMLInputElement>(null);
  useSlashFocus(searchRef);
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<string>('publish');
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminProduct | null>(null);
  const [importResult, setImportResult] = useState<string | null>(null);

  const { data, isLoading, isError, error, refetch } = useAdminProducts({
    page,
    ...(status ? { status } : {}),
    ...(q ? { q } : {}),
    ...(sort ? { sort } : {}),
  });
  const categoriesQuery = useAdminCategories();
  const mutation = useAdminProductMutation();
  const importProducts = useImportProducts();

  const totalPages = data?.meta?.totalPages ?? 1;
  const products = data?.data ?? [];
  const flatCats = useMemo(
    () => flattenCats(categoriesQuery.data ?? []),
    [categoriesQuery.data],
  );

  const updateQuery = useMemo(
    () =>
      (patch: Record<string, string | null>) => {
        const next = new URLSearchParams(searchParams.toString());
        for (const [k, v] of Object.entries(patch)) {
          if (v == null || v === '') next.delete(k);
          else next.set(k, v);
        }
        router.replace(`/admin/products?${next.toString()}`);
      },
    [searchParams, router],
  );

  const toggleOne = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const toggleAll = () =>
    setSelected((s) => (s.length === products.length ? [] : products.map((p) => p.id)));

  const [confirmingBulk, setConfirmingBulk] = useState(false);
  // Học Twenty incremental bulk: backend updateMany atomic 1 query nên không
  // cần chia batch, nhưng UI vẫn có progress + retry khi lỗi (partial-aware).
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);
  const [bulkFailed, setBulkFailed] = useState<string[]>([]);

  const runBulk = () => {
    setBulkProgress({ done: 0, total: selected.length });
    setBulkFailed([]);
    mutation.bulk.mutate(
      { action: bulkAction, ids: selected },
      {
        onSuccess: (r) => {
          toast.success((r as { message?: string })?.message ?? 'Đã áp dụng bulk');
          setSelected([]);
          setConfirmingBulk(false);
          setBulkProgress(null);
        },
        onError: (e) => {
          toast.error(friendlyAdminError(e));
          // Backend all-or-nothing → toàn bộ ids coi như failed, cho retry 1 chạm.
          setBulkFailed(selected);
          setBulkProgress(null);
        },
      },
    );
  };

  const handleBulk = () => {
    if (selected.length === 0) {
      toast.error('Chưa chọn sản phẩm nào');
      return;
    }
    // Destructive (delete) → confirm inline; các action khác chạy ngay (undo được).
    if (bulkAction === 'delete') setConfirmingBulk(true);
    else runBulk();
  };

  const handleDelete = (id: string) => {
    mutation.remove.mutate(id, {
      onSuccess: () => {
        toast.success('Đã xóa sản phẩm');
        setConfirmingId(null);
        setSelected((s) => s.filter((x) => x !== id));
      },
      onError: (e) => toast.error(friendlyAdminError(e)),
    });
  };

  const handleRestore = (id: string) => {
    mutation.restore.mutate(id, {
      onSuccess: () => toast.success('Đã khôi phục sản phẩm'),
      onError: (e) => toast.error(friendlyAdminError(e)),
    });
  };

  const handleImportFile = async (file: File) => {
    setImportResult(null);
    try {
      const r = (await importProducts.mutateAsync(file)) as {
        total?: number;
        success?: number;
        failed?: number;
      };
      setImportResult(`Nhập ${r.success ?? '?'} / ${r.total ?? '?'} dòng thành công, ${r.failed ?? '?'} lỗi.`);
      toast.success('Import CSV xong');
    } catch (e) {
      setImportResult(`Lỗi: ${(e as Error).message}`);
    }
  };

  const confirmingProduct = confirmingId ? products.find((p) => p.id === confirmingId) : null;
  const submitting = mutation.create.isPending || mutation.update.isPending;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-bold text-slate-900">
          Sản phẩm{data?.meta?.total != null ? ` (${data.meta.total})` : ''}
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <form
            className="relative"
            onSubmit={(e) => {
              e.preventDefault();
              updateQuery({ q: searchInput, page: null });
            }}
          >
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              ref={searchRef}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="SKU, tên sản phẩm…  ( / )"
              className="h-10 w-56 rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm shadow-sm outline-none focus:border-emerald-400"
            />
          </form>
          <select
            value={sort}
            onChange={(e) => updateQuery({ sort: e.target.value || null, page: null })}
            aria-label="Sắp xếp"
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm outline-none focus:border-emerald-400"
          >
            <option value="">Mới nhất</option>
            <option value="best_selling">Bán chạy</option>
            <option value="price_asc">Giá tăng dần</option>
            <option value="price_desc">Giá giảm dần</option>
            <option value="rating">Đánh giá cao</option>
          </select>
          <select
            value={status}
            onChange={(e) => updateQuery({ status: e.target.value || null, page: null })}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm outline-none focus:border-emerald-400"
          >
            <option value="">Tất cả trạng thái</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          {isManager && (
            <Button
              size="md"
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
            >
              + Thêm sản phẩm
            </Button>
          )}
        </div>
      </div>

      {isError && (
        <ErrorState
          message={`Không tải được danh sách: ${(error as Error).message}`}
          onRetry={() => refetch()}
        />
      )}

      <FilterChips
        chips={[
          ...(q ? [{ key: 'q', label: `"${q}"`, onRemove: () => { setSearchInput(''); updateQuery({ q: null, page: null }); } }] : []),
          ...(status ? [{ key: 'status', label: `Trạng thái: ${STATUS_LABELS[status] ?? status}`, onRemove: () => updateQuery({ status: null, page: null }) }] : []),
          ...(sort ? [{ key: 'sort', label: `Sắp xếp: ${{ best_selling: 'Bán chạy', price_asc: 'Giá ↑', price_desc: 'Giá ↓', rating: 'Đánh giá cao' }[sort] ?? sort}`, onRemove: () => updateQuery({ sort: null, page: null }) }] : []),
        ]}
        onClearAll={() => { setSearchInput(''); updateQuery({ q: null, status: null, sort: null, page: null }); }}
      />

      {isManager && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm">
          <span className="text-sm font-medium text-slate-600">
            {selected.length > 0 ? `Đã chọn ${selected.length}` : 'Bulk'}:
          </span>
          <select
            value={bulkAction}
            onChange={(e) => setBulkAction(e.target.value)}
            className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-emerald-400"
            aria-label="Hành động hàng loạt"
          >
            {BULK_ACTIONS.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
          <Button size="sm" variant="outline" loading={mutation.bulk.isPending} onClick={handleBulk}>
            Áp dụng
          </Button>
          {mutation.bulk.isPending && bulkProgress && (
            <span className="text-xs font-medium text-slate-500" role="status">
              Đang xử lý {bulkProgress.done}/{bulkProgress.total}…
            </span>
          )}
          {bulkFailed.length > 0 && !mutation.bulk.isPending && (
            <button
              onClick={() => {
                setSelected(bulkFailed);
                setBulkFailed([]);
                runBulk();
              }}
              className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100"
            >
              Thử lại {bulkFailed.length} mục lỗi
            </button>
          )}
          <div className="ml-auto flex items-center gap-2">
            <label className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
              {importProducts.isPending ? 'Đang nhập…' : 'Import CSV'}
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                disabled={importProducts.isPending}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (file) void handleImportFile(file);
                }}
              />
            </label>
          </div>
        </div>
      )}
      {importResult && (
        <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
          {importResult} Header CSV: sku,name,price,categorySlug,stock,weightGrams,description
        </p>
      )}

      <DialogLite
        open={Boolean(confirmingProduct)}
        onClose={() => setConfirmingId(null)}
        title={confirmingProduct ? `Xóa ${confirmingProduct.name}?` : 'Xóa sản phẩm'}
      >
        <p className="text-sm text-slate-700">
          SKU <strong>{confirmingProduct?.sku}</strong>. Hành động này không thể hoàn tác.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmingId(null)}>Hủy</Button>
          <Button
            variant="danger"
            loading={mutation.remove.isPending}
            onClick={() => confirmingProduct && handleDelete(confirmingProduct.id)}
          >
            Xác nhận xóa
          </Button>
        </div>
      </DialogLite>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {isManager && (
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      aria-label="Chọn tất cả"
                      checked={products.length > 0 && selected.length === products.length}
                      onChange={toggleAll}
                    />
                  </th>
                )}
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Tên</th>
                <th className="px-4 py-3 text-right">Giá</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3 text-right">Đã bán</th>
                <th className="px-4 py-3">Ngày tạo</th>
                {isManager && <th className="px-4 py-3 text-right">Thao tác</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={isManager ? 8 : 6} className="px-4 py-3.5">
                        <Skeleton className="h-6 w-full" />
                      </td>
                    </tr>
                  ))
                : products.map((p) => (
                    <tr key={p.id} className="transition-colors hover:bg-slate-50/60">
                      {isManager && (
                        <td className="px-4 py-3.5">
                          <input
                            type="checkbox"
                            aria-label={`Chọn ${p.sku}`}
                            checked={selected.includes(p.id)}
                            onChange={() => toggleOne(p.id)}
                          />
                        </td>
                      )}
                      <td className="px-4 py-3.5 font-mono text-xs font-semibold text-slate-800">{p.sku}</td>
                      <td className="px-4 py-3.5 font-medium text-slate-800">{p.name}</td>
                      <td className="px-4 py-3.5 text-right font-semibold text-slate-900">
                        {formatCurrency(p.price)}
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="px-4 py-3.5 text-right text-slate-700">{p.soldCount ?? 0}</td>
                      <td className="px-4 py-3.5 text-xs text-slate-500">{formatDate(p.createdAt)}</td>
                      {isManager && (
                        <td className="px-4 py-3.5">
                          <div className="flex justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditing(p);
                                setDialogOpen(true);
                              }}
                            >
                              Sửa
                            </Button>
                            {p.status === 'ARCHIVED' ? (
                              <Button
                                size="sm"
                                variant="outline"
                                loading={mutation.restore.isPending}
                                onClick={() => handleRestore(p.id)}
                              >
                                Khôi phục
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-600 hover:bg-red-50"
                                onClick={() => setConfirmingId(p.id)}
                              >
                                Xóa
                              </Button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
              {!isLoading && products.length === 0 && !isError && (
                <tr>
                  <td colSpan={isManager ? 8 : 6} className="px-4 py-8">
                    <EmptyState
                      title={q || status ? 'Không có sản phẩm nào khớp bộ lọc' : 'Chưa có sản phẩm nào'}
                      description={
                        q || status
                          ? 'Thử bỏ bớt điều kiện tìm kiếm / lọc.'
                          : 'Thêm sản phẩm đầu tiên để bắt đầu xây catalog.'
                      }
                      actionLabel={q || status ? 'Xóa bộ lọc' : isManager ? '+ Thêm sản phẩm' : undefined}
                      onAction={() =>
                        q || status
                          ? (setSearchInput(''), updateQuery({ q: null, status: null, sort: null, page: null }))
                          : (setEditing(null), setDialogOpen(true))
                      }
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination page={page} totalPages={totalPages} onChange={(p) => updateQuery({ page: String(p) })} />

      <DialogLite
        open={confirmingBulk}
        onClose={() => setConfirmingBulk(false)}
        title={`Xóa ${selected.length} sản phẩm?`}
      >
        <p className="text-sm text-slate-700">
          Hành động này không thể hoàn tác. Các sản phẩm đã chọn sẽ bị xóa khỏi catalog:
        </p>
        <ul className="mt-2 max-h-32 space-y-1 overflow-auto rounded-xl bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700">
          {products
            .filter((p) => selected.includes(p.id))
            .slice(0, 5)
            .map((p) => (
              <li key={p.id}>• {p.sku} — {p.name}</li>
            ))}
          {selected.length > 5 && <li>… và {selected.length - 5} sản phẩm nữa</li>}
        </ul>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmingBulk(false)}>Hủy</Button>
          <Button variant="danger" loading={mutation.bulk.isPending} onClick={runBulk}>
            Xác nhận xóa {selected.length} sản phẩm
          </Button>
        </div>
      </DialogLite>

      <DialogLite
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editing ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}
      >
        <ProductForm
          key={editing?.id ?? 'new'}
          initial={editing}
          categories={flatCats}
          submitting={submitting}
          onCancel={() => setDialogOpen(false)}
          onSubmit={(body) => {
            if (editing) {
              mutation.update.mutate(
                { id: editing.id, body },
                {
                  onSuccess: () => {
                    toast.success('Đã cập nhật sản phẩm');
                    setDialogOpen(false);
                  },
                  onError: (e) => toast.error(friendlyAdminError(e)),
                },
              );
            } else {
              mutation.create.mutate(body, {
                onSuccess: () => {
                  toast.success('Đã thêm sản phẩm');
                  setDialogOpen(false);
                },
                onError: (e) => toast.error(friendlyAdminError(e)),
              });
            }
          }}
        />
      </DialogLite>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === 'PUBLISHED'
      ? 'bg-emerald-50 text-emerald-700'
      : status === 'DRAFT'
        ? 'bg-slate-100 text-slate-600'
        : 'bg-red-50 text-red-700';
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

function flattenCats(cats: AdminCategory[], depth = 0): { cat: AdminCategory; depth: number }[] {
  const out: { cat: AdminCategory; depth: number }[] = [];
  for (const c of cats) {
    out.push({ cat: c, depth });
    if (c.children?.length) out.push(...flattenCats(c.children, depth + 1));
  }
  return out;
}

const productSchema = z.object({
  sku: z.string().min(1, 'Vui lòng nhập SKU'),
  name: z.string().min(1, 'Vui lòng nhập tên'),
  price: z.number().min(0, 'Giá phải >= 0'),
  categoryId: z.string().min(1, 'Vui lòng chọn danh mục'),
  stock: z.number().min(0, 'Tồn kho phải >= 0').optional(),
});

type ProductFormValues = z.infer<typeof productSchema>;

function ProductForm({
  initial,
  categories,
  submitting,
  onSubmit,
  onCancel,
}: {
  initial: AdminProduct | null;
  categories: { cat: AdminCategory; depth: number }[];
  submitting: boolean;
  onSubmit: (body: Record<string, unknown>) => void;
  onCancel: () => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      sku: initial?.sku ?? '',
      name: initial?.name ?? '',
      price: initial?.price ?? 0,
      categoryId: initial?.categoryId ?? '',
      stock: 0,
    },
  });

  return (
    <form
      className="space-y-3"
      onSubmit={handleSubmit((data) =>
        onSubmit({
          sku: data.sku.trim(),
          name: data.name.trim(),
          price: Number(data.price),
          categoryId: data.categoryId,
          ...(data.stock != null ? { stock: Number(data.stock) } : {}),
        }),
      )}
    >
      <div>
        <label htmlFor="prod-sku" className="mb-1 block text-sm font-medium text-slate-700">SKU</label>
        <Input id="prod-sku" {...register('sku')} error={errors.sku?.message} />
      </div>
      <div>
        <label htmlFor="prod-name" className="mb-1 block text-sm font-medium text-slate-700">Tên sản phẩm</label>
        <Input id="prod-name" {...register('name')} error={errors.name?.message} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="prod-price" className="mb-1 block text-sm font-medium text-slate-700">Giá (đ)</label>
          <Input id="prod-price" type="number" min={0} {...register('price', { valueAsNumber: true })} error={errors.price?.message} />
        </div>
        <div>
          <label htmlFor="prod-stock" className="mb-1 block text-sm font-medium text-slate-700">Tồn kho</label>
          <Input id="prod-stock" type="number" min={0} {...register('stock', { valueAsNumber: true })} error={errors.stock?.message} />
        </div>
      </div>
      <div>
        <label htmlFor="prod-cat" className="mb-1 block text-sm font-medium text-slate-700">Danh mục</label>
        <Select id="prod-cat" {...register('categoryId')} error={errors.categoryId?.message}>
          <option value="">— Chọn danh mục —</option>
          {categories.map(({ cat, depth }) => (
            <option key={cat.id} value={cat.id}>
              {'— '.repeat(depth)}{cat.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Huỷ
        </Button>
        <Button type="submit" loading={submitting}>
          {initial ? 'Lưu thay đổi' : 'Thêm sản phẩm'}
        </Button>
      </div>
    </form>
  );
}
