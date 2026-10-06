'use client';

import { useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAdminPromotions, useAdminVoucherMutation, useAdminVouchers } from '@/hooks/use-admin';
import { useAuthStore } from '@/stores/auth-store';
import { toast } from '@/stores/toast-store';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { DialogLite } from '@/components/ui/dialog-lite';
import { EmptyState, ErrorState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { AdminVoucher } from '@/lib/admin-types';

const VOUCHER_TYPES = ['PERCENTAGE', 'FIXED_AMOUNT', 'FREE_SHIPPING'] as const;
const VOUCHER_STATUSES = ['ACTIVE', 'INACTIVE'] as const;

const voucherSchema = z.object({
  code: z.string().min(1, 'Vui lòng nhập mã voucher'),
  type: z.enum(VOUCHER_TYPES),
  value: z.coerce.number().min(0, 'Giá trị phải >= 0'),
  status: z.enum(VOUCHER_STATUSES),
  startsAt: z.string().min(1, 'Vui lòng chọn ngày bắt đầu'),
  endsAt: z.string().min(1, 'Vui lòng chọn ngày kết thúc'),
});

type VoucherForm = z.infer<typeof voucherSchema>;

const toLocal = (iso: string) => iso.slice(0, 16);

function formatValue(v: AdminVoucher): string {
  if (v.type === 'PERCENTAGE') return `${v.value}%`;
  if (v.type === 'FREE_SHIPPING') return 'Miễn phí ship';
  return formatCurrency(v.value);
}

export default function AdminVouchersPage() {
  const { user } = useAuthStore();
  const isManager = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const isAdmin = user?.role === 'ADMIN';

  const vouchersQuery = useAdminVouchers();
  const promotionsQuery = useAdminPromotions();
  const mutation = useAdminVoucherMutation();

  const [dialog, setDialog] = useState<{ open: boolean; editing: AdminVoucher | null }>({
    open: false,
    editing: null,
  });
  const [confirming, setConfirming] = useState<AdminVoucher | null>(null);

  if (!isManager) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-8 text-center">
        <p className="text-sm font-medium text-amber-800">
          Trang voucher chỉ dành cho MANAGER/ADMIN.
        </p>
      </div>
    );
  }

  const vouchers = vouchersQuery.data ?? [];
  const promotions = promotionsQuery.data ?? [];

  const openCreate = () => setDialog({ open: true, editing: null });
  const openEdit = (v: AdminVoucher) => setDialog({ open: true, editing: v });

  const handleDelete = (v: AdminVoucher) => {
    mutation.remove.mutate(v.id, {
      onSuccess: () => {
        toast.success(`Đã xóa voucher ${v.code}`);
        setConfirming(null);
      },
      onError: (err) => toast.error(err.message),
    });
  };

  return (
    <div className="space-y-8">
      <section className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-bold text-slate-900">
            Vouchers{vouchersQuery.data ? ` (${vouchers.length})` : ''}
          </h2>
          <Button size="sm" onClick={openCreate}>
            + Tạo voucher
          </Button>
        </div>

        {vouchersQuery.isError && (
          <ErrorState
            message={`Không tải được danh sách: ${(vouchersQuery.error as Error).message}`}
            onRetry={() => vouchersQuery.refetch()}
          />
        )}

        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Mã</th>
                  <th className="px-4 py-3">Loại</th>
                  <th className="px-4 py-3 text-right">Giá trị</th>
                  <th className="px-4 py-3">Đã dùng</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3">Hiệu lực</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vouchersQuery.isLoading
                  ? Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i}>
                        <td colSpan={7} className="px-4 py-3.5">
                          <Skeleton className="h-6 w-full" />
                        </td>
                      </tr>
                    ))
                  : vouchers.map((v) => (
                      <tr key={v.id} className="transition-colors hover:bg-slate-50/60">
                        <td className="px-4 py-3.5 font-semibold text-slate-900">{v.code}</td>
                        <td className="px-4 py-3.5 text-slate-600">{v.type}</td>
                        <td className="px-4 py-3.5 text-right font-semibold text-slate-900">
                          {formatValue(v)}
                        </td>
                        <td className="px-4 py-3.5 text-slate-600">
                          {v.usedCount}/{v.usageLimit ?? '∞'}
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={
                              v.status === 'ACTIVE'
                                ? 'rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700'
                                : 'rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500'
                            }
                          >
                            {v.status === 'ACTIVE' ? 'Đang chạy' : 'Tắt'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-500">
                          {formatDate(v.startsAt)} — {formatDate(v.endsAt)}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => openEdit(v)}>
                              Sửa
                            </Button>
                            {isAdmin && (
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => setConfirming(v)}
                              >
                                Xóa
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                {!vouchersQuery.isLoading && vouchers.length === 0 && !vouchersQuery.isError && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8">
                      <EmptyState
                        title="Chưa có voucher nào"
                        description="Tạo voucher đầu tiên để chạy khuyến mãi cho cửa hàng."
                        actionLabel="+ Tạo voucher"
                        onAction={openCreate}
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="space-y-5">
        <h2 className="text-base font-bold text-slate-900">
          Khuyến mãi tự động{promotionsQuery.data ? ` (${promotions.length})` : ''}
        </h2>

        {promotionsQuery.isError && (
          <ErrorState
            message={`Không tải được danh sách: ${(promotionsQuery.error as Error).message}`}
            onRetry={() => promotionsQuery.refetch()}
          />
        )}

        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Tên</th>
                  <th className="px-4 py-3">Loại</th>
                  <th className="px-4 py-3 text-right">Giá trị</th>
                  <th className="px-4 py-3">Phạm vi</th>
                  <th className="px-4 py-3">Thời gian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {promotionsQuery.isLoading
                  ? Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i}>
                        <td colSpan={5} className="px-4 py-3.5">
                          <Skeleton className="h-6 w-full" />
                        </td>
                      </tr>
                    ))
                  : promotions.map((p) => (
                      <tr key={p.id} className="transition-colors hover:bg-slate-50/60">
                        <td className="px-4 py-3.5 font-medium text-slate-800">{p.name}</td>
                        <td className="px-4 py-3.5 text-slate-600">{p.type}</td>
                        <td className="px-4 py-3.5 text-right font-semibold text-slate-900">
                          {p.type === 'PERCENTAGE' ? `${p.value}%` : formatCurrency(p.value)}
                        </td>
                        <td className="px-4 py-3.5 text-slate-600">{p.scope ?? '—'}</td>
                        <td className="px-4 py-3.5 text-xs text-slate-500">
                          {formatDate(p.startsAt)} — {formatDate(p.endsAt)}
                        </td>
                      </tr>
                    ))}
                {!promotionsQuery.isLoading && promotions.length === 0 && !promotionsQuery.isError && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8">
                      <EmptyState
                        title="Chưa có khuyến mãi nào"
                        description="Khuyến mãi tự động do hệ thống tạo — không cần thao tác."
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <DialogLite
        open={Boolean(confirming)}
        onClose={() => setConfirming(null)}
        title={confirming ? `Xóa voucher ${confirming.code}?` : 'Xóa voucher'}
      >
        <p className="text-sm text-slate-700">
          Hành động này không thể hoàn tác.
          {confirming && <> Đã có <strong>{confirming.usedCount}</strong> lượt dùng{confirming.usageLimit ? <>/{confirming.usageLimit}</> : null}.</>}
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirming(null)}>Hủy</Button>
          <Button
            variant="danger"
            loading={mutation.remove.isPending}
            onClick={() => confirming && handleDelete(confirming)}
          >
            Xác nhận xóa
          </Button>
        </div>
      </DialogLite>

      <VoucherDialog
        open={dialog.open}
        editing={dialog.editing}
        pending={mutation.create.isPending || mutation.update.isPending}
        onClose={() => setDialog({ open: false, editing: null })}
        onSubmit={(data) => {
          const body = {
            ...data,
            code: data.code.trim().toUpperCase(),
            startsAt: new Date(data.startsAt).toISOString(),
            endsAt: new Date(data.endsAt).toISOString(),
          };
          if (dialog.editing) {
            mutation.update.mutate(
              { id: dialog.editing.id, body },
              {
                onSuccess: () => {
                  setDialog({ open: false, editing: null });
                  toast.success('Đã cập nhật voucher');
                },
                onError: (err) => toast.error(err.message),
              },
            );
          } else {
            mutation.create.mutate(body, {
              onSuccess: () => {
                setDialog({ open: false, editing: null });
                toast.success('Đã tạo voucher');
              },
              onError: (err) => toast.error(err.message),
            });
          }
        }}
      />
    </div>
  );
}

function VoucherDialog({
  open,
  editing,
  pending,
  onClose,
  onSubmit,
}: {
  open: boolean;
  editing: AdminVoucher | null;
  pending: boolean;
  onClose: () => void;
  onSubmit: (data: VoucherForm) => void;
}) {
  return (
    <DialogLite open={open} onClose={onClose} title={editing ? `Sửa voucher ${editing.code}` : 'Tạo voucher'}>
      <VoucherFields key={editing?.id ?? 'new'} editing={editing} pending={pending} onSubmit={onSubmit} onCancel={onClose} />
    </DialogLite>
  );
}

function VoucherFields({
  editing,
  pending,
  onSubmit,
  onCancel,
}: {
  editing: AdminVoucher | null;
  pending: boolean;
  onSubmit: (data: VoucherForm) => void;
  onCancel: () => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<VoucherForm>({
    resolver: zodResolver(voucherSchema) as Resolver<VoucherForm>,
    defaultValues: editing
      ? {
          code: editing.code,
          type: (editing.type as VoucherForm['type']) ?? 'FIXED_AMOUNT',
          value: editing.value,
          status: (editing.status as VoucherForm['status']) ?? 'ACTIVE',
          startsAt: toLocal(editing.startsAt),
          endsAt: toLocal(editing.endsAt),
        }
      : { code: '', type: 'FIXED_AMOUNT', value: 0, status: 'ACTIVE', startsAt: '', endsAt: '' },
  });

  return (
    <form className="space-y-3" onSubmit={handleSubmit(onSubmit)}>
      <div>
        <label htmlFor="voucher-code" className="mb-1 block text-sm font-medium text-slate-700">Mã voucher</label>
        <Input id="voucher-code" placeholder="VD: TET2026" {...register('code')} error={errors.code?.message} />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="voucher-type" className="mb-1 block text-sm font-medium text-slate-700">Loại</label>
          <Select id="voucher-type" {...register('type')} error={errors.type?.message}>
            <option value="PERCENTAGE">Phần trăm (%)</option>
            <option value="FIXED_AMOUNT">Tiền cố định (₫)</option>
            <option value="FREE_SHIPPING">Miễn phí ship</option>
          </Select>
        </div>
        <div>
          <label htmlFor="voucher-value" className="mb-1 block text-sm font-medium text-slate-700">Giá trị</label>
          <Input id="voucher-value" type="number" min={0} {...register('value')} error={errors.value?.message} />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="voucher-starts" className="mb-1 block text-sm font-medium text-slate-700">Bắt đầu</label>
          <Input id="voucher-starts" type="datetime-local" {...register('startsAt')} error={errors.startsAt?.message} />
        </div>
        <div>
          <label htmlFor="voucher-ends" className="mb-1 block text-sm font-medium text-slate-700">Kết thúc</label>
          <Input id="voucher-ends" type="datetime-local" {...register('endsAt')} error={errors.endsAt?.message} />
        </div>
      </div>
      <div>
        <label htmlFor="voucher-status" className="mb-1 block text-sm font-medium text-slate-700">Trạng thái</label>
        <Select id="voucher-status" {...register('status')} error={errors.status?.message}>
          <option value="ACTIVE">Đang chạy</option>
          <option value="INACTIVE">Tắt</option>
        </Select>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Hủy
        </Button>
        <Button type="submit" loading={pending}>
          {editing ? 'Lưu thay đổi' : 'Tạo voucher'}
        </Button>
      </div>
    </form>
  );
}
