'use client';

import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAdminBrands, useAdminCatalogMutation, useAdminCategories } from '@/hooks/use-admin';
import { useAuthStore } from '@/stores/auth-store';
import { toast } from '@/stores/toast-store';
import type { AdminBrand, AdminCategory } from '@/lib/admin-types';
import { Button } from '@/components/ui/button';
import { Input, Select, Textarea } from '@/components/ui/input';
import { DialogLite } from '@/components/ui/dialog-lite';
import { ListSkeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/empty-state';

type Tab = 'categories' | 'brands';

export default function AdminCatalogPage() {
  const [tab, setTab] = useState<Tab>('categories');

  return (
    <div className="space-y-5">
      <h2 className="text-base font-bold text-slate-900">Danh mục & thương hiệu</h2>
      <div className="flex gap-1 rounded-xl bg-slate-100 p-1 text-sm font-semibold">
        {(
          [
            { value: 'categories', label: 'Danh mục' },
            { value: 'brands', label: 'Thương hiệu' },
          ] as const
        ).map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            aria-pressed={tab === t.value}
            className={`flex-1 rounded-lg px-4 py-2 transition-colors ${
              tab === t.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'categories' ? <CategoriesTab /> : <BrandsTab />}
    </div>
  );
}

// ─── Tab danh mục ────────────────────────────────────────────────────

function CategoriesTab() {
  const { user } = useAuthStore();
  const isManager = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const query = useAdminCategories();
  const mutation = useAdminCatalogMutation();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminCategory | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const flat = useMemo(() => flattenCats(query.data ?? []), [query.data]);
  const confirmingCat = confirmingId ? (flat.find(({ cat }) => cat.id === confirmingId)?.cat ?? null) : null;
  const submitting = mutation.createCategory.isPending || mutation.updateCategory.isPending;

  const handleDelete = (id: string) => {
    mutation.deleteCategory.mutate(id, {
      onSuccess: () => {
        toast.success('Đã xóa danh mục');
        setConfirmingId(null);
      },
      onError: (e) => toast.error(e.message),
    });
  };

  if (query.isLoading) return <ListSkeleton rows={4} />;
  if (query.isError)
    return <ErrorState message={`Không tải được danh mục: ${(query.error as Error).message}`} onRetry={() => query.refetch()} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">Danh sách phẳng (hiện parentId).</p>
        {isManager && (
          <Button
            size="sm"
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            + Thêm danh mục
          </Button>
        )}
      </div>

      <DialogLite
        open={Boolean(confirmingCat)}
        onClose={() => setConfirmingId(null)}
        title={confirmingCat ? `Xóa danh mục ${confirmingCat.name}?` : 'Xóa danh mục'}
      >
        <p className="text-sm text-slate-700">
          Hành động này không thể hoàn tác.
          {confirmingCat?.children?.length ? <> Danh mục có <strong>{confirmingCat.children.length}</strong> danh mục con — cần chuyển/xóa con trước.</> : null}
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmingId(null)}>Hủy</Button>
          <Button
            variant="danger"
            loading={mutation.deleteCategory.isPending}
            onClick={() => confirmingId && handleDelete(confirmingId)}
          >
            Xác nhận xóa
          </Button>
        </div>
      </DialogLite>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3">Tên</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Parent</th>
              <th className="px-4 py-3 text-right">Thứ tự</th>
              {isManager && <th className="px-4 py-3 text-right">Thao tác</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {flat.map(({ cat, depth }) => (
              <tr key={cat.id} className="transition-colors hover:bg-slate-50/60">
                <td className="px-4 py-3 font-medium text-slate-800">
                  <span style={{ paddingLeft: depth * 16 }}>{cat.name}</span>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{cat.slug}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{cat.parentId ?? '—'}</td>
                <td className="px-4 py-3 text-right text-slate-700">{cat.sortOrder}</td>
                {isManager && (
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditing(cat);
                          setDialogOpen(true);
                        }}
                      >
                        Sửa
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:bg-red-50"
                        onClick={() => setConfirmingId(cat.id)}
                      >
                        Xóa
                      </Button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {flat.length === 0 && (
              <tr>
                <td colSpan={isManager ? 5 : 4} className="px-4 py-8">
                  <EmptyState
                    title="Chưa có danh mục nào"
                    description="Tạo danh mục đầu tiên để tổ chức catalog."
                    actionLabel={isManager ? '+ Thêm danh mục' : undefined}
                    onAction={() => { setEditing(null); setDialogOpen(true); }}
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <DialogLite
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editing ? 'Sửa danh mục' : 'Thêm danh mục'}
      >
        <CategoryForm
          key={editing?.id ?? 'new'}
          initial={editing}
          all={flat}
          submitting={submitting}
          onCancel={() => setDialogOpen(false)}
          onSubmit={(body) => {
            const done = {
              onSuccess: () => {
                toast.success(editing ? 'Đã cập nhật danh mục' : 'Đã thêm danh mục');
                setDialogOpen(false);
              },
              onError: (e: Error) => toast.error(e.message),
            };
            if (editing) mutation.updateCategory.mutate({ id: editing.id, body }, done);
            else mutation.createCategory.mutate(body, done);
          }}
        />
      </DialogLite>
    </div>
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

const categorySchema = z.object({
  name: z.string().min(1, 'Vui lòng nhập tên'),
  slug: z.string().optional(),
  description: z.string().optional(),
  parentId: z.string().optional(),
  sortOrder: z.number().int().optional(),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

function CategoryForm({
  initial,
  all,
  submitting,
  onSubmit,
  onCancel,
}: {
  initial: AdminCategory | null;
  all: { cat: AdminCategory; depth: number }[];
  submitting: boolean;
  onSubmit: (body: Record<string, unknown>) => void;
  onCancel: () => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: initial?.name ?? '',
      slug: initial?.slug ?? '',
      description: initial?.description ?? '',
      parentId: initial?.parentId ?? '',
      sortOrder: initial?.sortOrder ?? 0,
    },
  });

  return (
    <form
      className="space-y-3"
      onSubmit={handleSubmit((data) =>
        onSubmit({
          name: data.name.trim(),
          ...(data.slug?.trim() ? { slug: data.slug.trim() } : {}),
          ...(data.description?.trim() ? { description: data.description.trim() } : {}),
          ...(data.parentId ? { parentId: data.parentId } : { parentId: null }),
          ...(data.sortOrder != null ? { sortOrder: Number(data.sortOrder) } : {}),
        }),
      )}
    >
      <div>
        <label htmlFor="cat-name" className="mb-1 block text-sm font-medium text-slate-700">Tên</label>
        <Input id="cat-name" {...register('name')} error={errors.name?.message} />
      </div>
      <div>
        <label htmlFor="cat-slug" className="mb-1 block text-sm font-medium text-slate-700">
          Slug (để trống = tự sinh)
        </label>
        <Input id="cat-slug" {...register('slug')} error={errors.slug?.message} />
      </div>
      <div>
        <label htmlFor="cat-desc" className="mb-1 block text-sm font-medium text-slate-700">Mô tả</label>
        <Textarea id="cat-desc" {...register('description')} error={errors.description?.message} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="cat-parent" className="mb-1 block text-sm font-medium text-slate-700">Danh mục cha</label>
          <Select id="cat-parent" {...register('parentId')}>
            <option value="">— Không có —</option>
            {all
              .filter(({ cat }) => cat.id !== initial?.id)
              .map(({ cat, depth }) => (
                <option key={cat.id} value={cat.id}>
                  {'— '.repeat(depth)}{cat.name}
                </option>
              ))}
          </Select>
        </div>
        <div>
          <label htmlFor="cat-sort" className="mb-1 block text-sm font-medium text-slate-700">Thứ tự</label>
          <Input id="cat-sort" type="number" {...register('sortOrder', { valueAsNumber: true })} error={errors.sortOrder?.message} />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Huỷ
        </Button>
        <Button type="submit" loading={submitting}>
          {initial ? 'Lưu thay đổi' : 'Thêm danh mục'}
        </Button>
      </div>
    </form>
  );
}

// ─── Tab thương hiệu ─────────────────────────────────────────────────

function BrandsTab() {
  const { user } = useAuthStore();
  const isManager = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const query = useAdminBrands();
  const mutation = useAdminCatalogMutation();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminBrand | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const brands = query.data ?? [];
  const confirmingBrand = confirmingId ? (brands.find((b) => b.id === confirmingId) ?? null) : null;
  const submitting = mutation.createBrand.isPending || mutation.updateBrand.isPending;

  const handleDelete = (id: string) => {
    mutation.deleteBrand.mutate(id, {
      onSuccess: () => {
        toast.success('Đã xóa thương hiệu');
        setConfirmingId(null);
      },
      onError: (e) => toast.error(e.message),
    });
  };

  if (query.isLoading) return <ListSkeleton rows={4} />;
  if (query.isError)
    return <ErrorState message={`Không tải được thương hiệu: ${(query.error as Error).message}`} onRetry={() => query.refetch()} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Thương hiệu{brands.length > 0 ? ` (${brands.length})` : ''}.
        </p>
        {isManager && (
          <Button
            size="sm"
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            + Thêm thương hiệu
          </Button>
        )}
      </div>

      <DialogLite
        open={Boolean(confirmingBrand)}
        onClose={() => setConfirmingId(null)}
        title={confirmingBrand ? `Xóa thương hiệu ${confirmingBrand.name}?` : 'Xóa thương hiệu'}
      >
        <p className="text-sm text-slate-700">Hành động này không thể hoàn tác.</p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmingId(null)}>Hủy</Button>
          <Button
            variant="danger"
            loading={mutation.deleteBrand.isPending}
            onClick={() => confirmingId && handleDelete(confirmingId)}
          >
            Xác nhận xóa
          </Button>
        </div>
      </DialogLite>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3">Tên</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Logo</th>
              {isManager && <th className="px-4 py-3 text-right">Thao tác</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {brands.map((b) => (
              <tr key={b.id} className="transition-colors hover:bg-slate-50/60">
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-800">{b.name}</div>
                  {b.description && <div className="max-w-md truncate text-xs text-slate-500">{b.description}</div>}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{b.slug}</td>
                <td className="px-4 py-3 text-xs text-slate-500">
                  {b.logoUrl ? (
                    <span className="max-w-[200px] truncate font-mono">{b.logoUrl}</span>
                  ) : (
                    '—'
                  )}
                </td>
                {isManager && (
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditing(b);
                          setDialogOpen(true);
                        }}
                      >
                        Sửa
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:bg-red-50"
                        onClick={() => setConfirmingId(b.id)}
                      >
                        Xóa
                      </Button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {brands.length === 0 && (
              <tr>
                <td colSpan={isManager ? 4 : 3} className="px-4 py-8">
                  <EmptyState
                    title="Chưa có thương hiệu nào"
                    description="Thêm thương hiệu để gắn cho sản phẩm."
                    actionLabel={isManager ? '+ Thêm thương hiệu' : undefined}
                    onAction={() => { setEditing(null); setDialogOpen(true); }}
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <DialogLite
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editing ? 'Sửa thương hiệu' : 'Thêm thương hiệu'}
      >
        <BrandForm
          key={editing?.id ?? 'new'}
          initial={editing}
          submitting={submitting}
          onCancel={() => setDialogOpen(false)}
          onSubmit={(body) => {
            const done = {
              onSuccess: () => {
                toast.success(editing ? 'Đã cập nhật thương hiệu' : 'Đã thêm thương hiệu');
                setDialogOpen(false);
              },
              onError: (e: Error) => toast.error(e.message),
            };
            if (editing) mutation.updateBrand.mutate({ id: editing.id, body }, done);
            else mutation.createBrand.mutate(body, done);
          }}
        />
      </DialogLite>
    </div>
  );
}

const brandSchema = z.object({
  name: z.string().min(1, 'Vui lòng nhập tên'),
  slug: z.string().optional(),
  logoUrl: z.string().optional(),
  description: z.string().optional(),
});

type BrandFormValues = z.infer<typeof brandSchema>;

function BrandForm({
  initial,
  submitting,
  onSubmit,
  onCancel,
}: {
  initial: AdminBrand | null;
  submitting: boolean;
  onSubmit: (body: Record<string, unknown>) => void;
  onCancel: () => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BrandFormValues>({
    resolver: zodResolver(brandSchema),
    defaultValues: {
      name: initial?.name ?? '',
      slug: initial?.slug ?? '',
      logoUrl: initial?.logoUrl ?? '',
      description: initial?.description ?? '',
    },
  });

  return (
    <form
      className="space-y-3"
      onSubmit={handleSubmit((data) =>
        onSubmit({
          name: data.name.trim(),
          ...(data.slug?.trim() ? { slug: data.slug.trim() } : {}),
          ...(data.logoUrl?.trim() ? { logoUrl: data.logoUrl.trim() } : {}),
          ...(data.description?.trim() ? { description: data.description.trim() } : {}),
        }),
      )}
    >
      <div>
        <label htmlFor="brand-name" className="mb-1 block text-sm font-medium text-slate-700">Tên</label>
        <Input id="brand-name" {...register('name')} error={errors.name?.message} />
      </div>
      <div>
        <label htmlFor="brand-slug" className="mb-1 block text-sm font-medium text-slate-700">
          Slug (để trống = tự sinh)
        </label>
        <Input id="brand-slug" {...register('slug')} error={errors.slug?.message} />
      </div>
      <div>
        <label htmlFor="brand-logo" className="mb-1 block text-sm font-medium text-slate-700">Logo URL</label>
        <Input id="brand-logo" placeholder="https://…" {...register('logoUrl')} error={errors.logoUrl?.message} />
      </div>
      <div>
        <label htmlFor="brand-desc" className="mb-1 block text-sm font-medium text-slate-700">Mô tả</label>
        <Textarea id="brand-desc" {...register('description')} error={errors.description?.message} />
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Huỷ
        </Button>
        <Button type="submit" loading={submitting}>
          {initial ? 'Lưu thay đổi' : 'Thêm thương hiệu'}
        </Button>
      </div>
    </form>
  );
}
