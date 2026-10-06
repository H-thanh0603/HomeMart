'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAdminShipments, useAdminShippingMutation } from '@/hooks/use-admin';
import { useAuthStore } from '@/stores/auth-store';
import { toast } from '@/stores/toast-store';
import { friendlyAdminError } from '@/lib/admin-helpers';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { DialogLite } from '@/components/ui/dialog-lite';
import { FilterChips } from '@/components/admin/filter-chips';
import { EmptyState, ErrorState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatDate } from '@/lib/utils';
import { SHIPMENT_STATUSES, type AdminShipmentRow } from '@/lib/admin-types';

const trackingSchema = z.object({
  trackingCode: z.string().min(1, 'Vui lòng nhập mã tracking'),
  carrierName: z.string().optional(),
  status: z.string().min(1, 'Vui lòng chọn trạng thái'),
});

type TrackingForm = z.infer<typeof trackingSchema>;

const METHOD_CODES = ['STANDARD', 'EXPRESS', 'SAME_DAY'] as const;

const methodSchema = z.object({
  code: z.enum(METHOD_CODES),
  name: z.string().min(1, 'Vui lòng nhập tên phương thức'),
  baseFee: z.coerce.number().min(0, 'Phí nền phải >= 0'),
  feePerKg: z.coerce.number().min(0, 'Phí theo kg phải >= 0'),
  estimatedDaysMin: z.coerce.number().int().min(0, 'Phải >= 0'),
  estimatedDaysMax: z.coerce.number().int().min(0, 'Phải >= 0'),
});

type MethodForm = z.infer<typeof methodSchema>;

export default function AdminShippingPage() {
  const { user } = useAuthStore();
  const isManager = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const searchParams = useSearchParams();
  const router = useRouter();
  const status = searchParams.get('status') ?? '';

  const shipmentsQuery = useAdminShipments(status ? { status } : {});
  const mutation = useAdminShippingMutation();

  const [trackingRow, setTrackingRow] = useState<AdminShipmentRow | null>(null);

  if (!isManager) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-8 text-center">
        <p className="text-sm font-medium text-amber-800">
          Trang vận chuyển chỉ dành cho MANAGER/ADMIN.
        </p>
      </div>
    );
  }

  const shipments = shipmentsQuery.data ?? [];

  const updateStatus = (next: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (!next) params.delete('status');
    else params.set('status', next);
    router.replace(`/admin/shipping?${params.toString()}`);
  };

  return (
    <div className="space-y-8">
      <section className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-bold text-slate-900">
            Vận chuyển{shipmentsQuery.data ? ` (${shipments.length})` : ''}
          </h2>
          <select
            value={status}
            onChange={(e) => updateStatus(e.target.value || null)}
            aria-label="Lọc theo trạng thái"
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm outline-none focus:border-emerald-400"
          >
            <option value="">Tất cả trạng thái</option>
            {SHIPMENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <FilterChips
          chips={status ? [{ key: 'status', label: `Trạng thái: ${status}`, onRemove: () => updateStatus(null) }] : []}
          onClearAll={() => updateStatus(null)}
        />

        {shipmentsQuery.isError && (
          <ErrorState
            message={`Không tải được danh sách: ${(shipmentsQuery.error as Error).message}`}
            onRetry={() => shipmentsQuery.refetch()}
          />
        )}

        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Mã đơn</th>
                  <th className="px-4 py-3">Phương thức</th>
                  <th className="px-4 py-3">Nhà vận chuyển</th>
                  <th className="px-4 py-3">Tracking</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3">Ngày tạo</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {shipmentsQuery.isLoading
                  ? Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i}>
                        <td colSpan={7} className="px-4 py-3.5">
                          <Skeleton className="h-6 w-full" />
                        </td>
                      </tr>
                    ))
                  : shipments.map((s) => (
                      <tr key={s.id} className="transition-colors hover:bg-slate-50/60">
                        <td className="px-4 py-3.5 font-semibold text-slate-900">
                          {s.order?.orderNumber ?? '—'}
                        </td>
                        <td className="px-4 py-3.5 text-slate-600">{s.method?.name ?? '—'}</td>
                        <td className="px-4 py-3.5 text-slate-600">{s.carrierName ?? '—'}</td>
                        <td className="px-4 py-3.5 font-mono text-xs text-slate-700">
                          {s.trackingCode ?? '—'}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                            {s.status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-500">
                          {formatDate(s.createdAt)}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <Button variant="outline" size="sm" onClick={() => setTrackingRow(s)}>
                            Cập nhật tracking
                          </Button>
                        </td>
                      </tr>
                    ))}
                {!shipmentsQuery.isLoading && shipments.length === 0 && !shipmentsQuery.isError && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8">
                      <EmptyState
                        title={status ? 'Không có shipment nào khớp bộ lọc' : 'Chưa có shipment nào'}
                        description={status ? 'Thử bỏ bớt điều kiện lọc.' : undefined}
                        actionLabel={status ? 'Xóa bộ lọc' : undefined}
                        onAction={() => updateStatus(null)}
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900">Tạo phương thức vận chuyển</h3>
        <p className="mt-1 text-sm text-slate-500">
          Chưa có endpoint liệt kê phương thức nên chỉ có form tạo.
        </p>
        <MethodForm pending={mutation.createMethod.isPending} onSubmit={(data) =>
          mutation.createMethod.mutate(data, {
            onSuccess: () => toast.success('Đã tạo phương thức vận chuyển'),
            onError: (err) => toast.error(friendlyAdminError(err)),
          })
        } />
      </section>

      <DialogLite open={Boolean(trackingRow)} onClose={() => setTrackingRow(null)} title={`Tracking — ${trackingRow?.order?.orderNumber ?? ''}`}>
        {trackingRow && (
          <TrackingFields
            key={trackingRow.id}
            row={trackingRow}
            pending={mutation.updateTracking.isPending}
            onCancel={() => setTrackingRow(null)}
            onSubmit={(data) =>
              mutation.updateTracking.mutate(
                { id: trackingRow.id, body: data },
                {
                  onSuccess: () => {
                    setTrackingRow(null);
                    toast.success('Đã cập nhật tracking');
                  },
                  onError: (err) => toast.error(friendlyAdminError(err)),
                },
              )
            }
          />
        )}
      </DialogLite>
    </div>
  );
}

function TrackingFields({
  row,
  pending,
  onSubmit,
  onCancel,
}: {
  row: AdminShipmentRow;
  pending: boolean;
  onSubmit: (data: TrackingForm) => void;
  onCancel: () => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TrackingForm>({
    resolver: zodResolver(trackingSchema) as Resolver<TrackingForm>,
    defaultValues: {
      trackingCode: row.trackingCode ?? '',
      carrierName: row.carrierName ?? '',
      status: row.status,
    },
  });

  return (
    <form className="space-y-3" onSubmit={handleSubmit(onSubmit)}>
      <div>
        <label htmlFor="tracking-code" className="mb-1 block text-sm font-medium text-slate-700">Mã tracking</label>
        <Input id="tracking-code" {...register('trackingCode')} error={errors.trackingCode?.message} />
      </div>
      <div>
        <label htmlFor="carrier-name" className="mb-1 block text-sm font-medium text-slate-700">Nhà vận chuyển</label>
        <Input id="carrier-name" placeholder="VD: GHN, GHTK" {...register('carrierName')} error={errors.carrierName?.message} />
      </div>
      <div>
        <label htmlFor="tracking-status" className="mb-1 block text-sm font-medium text-slate-700">Trạng thái</label>
        <Select id="tracking-status" {...register('status')} error={errors.status?.message}>
          {SHIPMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Hủy
        </Button>
        <Button type="submit" loading={pending}>
          Lưu tracking
        </Button>
      </div>
    </form>
  );
}

function MethodForm({
  pending,
  onSubmit,
}: {
  pending: boolean;
  onSubmit: (data: MethodForm) => void;
}) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<MethodForm>({
    resolver: zodResolver(methodSchema) as Resolver<MethodForm>,
    defaultValues: { code: 'STANDARD', name: '', baseFee: 0, feePerKg: 0, estimatedDaysMin: 1, estimatedDaysMax: 3 },
  });
  const baseFeePreview = watch('baseFee');

  return (
    <form
      className="mt-4 space-y-3"
      onSubmit={handleSubmit((data) => {
        onSubmit(data);
        reset();
      })}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="method-code" className="mb-1 block text-sm font-medium text-slate-700">Mã</label>
          <Select id="method-code" {...register('code')} error={errors.code?.message}>
            <option value="STANDARD">STANDARD</option>
            <option value="EXPRESS">EXPRESS</option>
            <option value="SAME_DAY">SAME_DAY</option>
          </Select>
        </div>
        <div>
          <label htmlFor="method-name" className="mb-1 block text-sm font-medium text-slate-700">Tên phương thức</label>
          <Input id="method-name" placeholder="VD: Giao tiêu chuẩn" {...register('name')} error={errors.name?.message} />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="method-base-fee" className="mb-1 block text-sm font-medium text-slate-700">Phí nền (₫)</label>
          <Input id="method-base-fee" type="number" min={0} {...register('baseFee')} error={errors.baseFee?.message} />
        </div>
        <div>
          <label htmlFor="method-per-kg" className="mb-1 block text-sm font-medium text-slate-700">Phí mỗi kg (₫)</label>
          <Input id="method-per-kg" type="number" min={0} {...register('feePerKg')} error={errors.feePerKg?.message} />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="method-days-min" className="mb-1 block text-sm font-medium text-slate-700">Số ngày tối thiểu</label>
          <Input id="method-days-min" type="number" min={0} {...register('estimatedDaysMin')} error={errors.estimatedDaysMin?.message} />
        </div>
        <div>
          <label htmlFor="method-days-max" className="mb-1 block text-sm font-medium text-slate-700">Số ngày tối đa</label>
          <Input id="method-days-max" type="number" min={0} {...register('estimatedDaysMax')} error={errors.estimatedDaysMax?.message} />
        </div>
      </div>
      <p className="text-xs text-slate-400">Phí nền hiện tại: {formatCurrency(Number(baseFeePreview) || 0)}</p>
      <div className="flex justify-end pt-1">
        <Button type="submit" loading={pending}>
          Tạo phương thức
        </Button>
      </div>
    </form>
  );
}
