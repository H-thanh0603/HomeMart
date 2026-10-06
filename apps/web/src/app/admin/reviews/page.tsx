'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Star } from 'lucide-react';
import { useAdminReviews, useModerateReview } from '@/hooks/use-admin';
import { REVIEW_STATUSES } from '@/lib/admin-types';
import { formatDate } from '@/lib/utils';
import { FilterChips } from '@/components/admin/filter-chips';
import { Button } from '@/components/ui/button';
import { DialogLite } from '@/components/ui/dialog-lite';
import { EmptyState, ErrorState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/stores/toast-store';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  HIDDEN: 'Đã ẩn',
};

type ModerateAction = 'APPROVED' | 'HIDDEN';

export default function AdminReviewsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const status = searchParams.get('status') ?? '';
  const page = Number(searchParams.get('page') ?? '1') || 1;

  const { data, isLoading, isError, error, refetch } = useAdminReviews({
    page,
    ...(status ? { status } : {}),
  });
  const moderate = useModerateReview();

  // review đang chờ confirm: {id, action}
  const [confirming, setConfirming] = useState<{ id: string; action: ModerateAction } | null>(null);

  const totalPages = data?.meta?.totalPages ?? 1;
  const reviews = data?.data ?? [];

  const updateQuery = useMemo(
    () =>
      (patch: Record<string, string | null>) => {
        const next = new URLSearchParams(searchParams.toString());
        for (const [k, v] of Object.entries(patch)) {
          if (v == null || v === '') next.delete(k);
          else next.set(k, v);
        }
        router.replace(`/admin/reviews?${next.toString()}`);
      },
    [searchParams, router],
  );

  const runModerate = (id: string, action: ModerateAction) => {
    setConfirming(null);
    moderate.mutate(
      { id, status: action },
      {
        onSuccess: () => toast.success(action === 'APPROVED' ? 'Đã duyệt đánh giá' : 'Đã ẩn đánh giá'),
        onError: (e: Error) => toast.error(`Thao tác thất bại: ${e.message}`),
      },
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-bold text-slate-900">
          Đánh giá{data?.meta?.total != null ? ` (${data.meta.total})` : ''}
        </h2>
        <select
          value={status}
          onChange={(e) => updateQuery({ status: e.target.value || null, page: null })}
          className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm outline-none focus:border-emerald-400"
        >
          <option value="">Tất cả trạng thái</option>
          {REVIEW_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s] ?? s}
            </option>
          ))}
        </select>
      </div>

      <FilterChips
        chips={status ? [{ key: 'status', label: `Trạng thái: ${STATUS_LABELS[status] ?? status}`, onRemove: () => updateQuery({ status: null, page: null }) }] : []}
        onClearAll={() => updateQuery({ status: null, page: null })}
      />

      {isError && (
        <ErrorState
          message={`Không tải được danh sách: ${(error as Error).message}`}
          onRetry={() => refetch()}
        />
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Đánh giá</th>
                <th className="px-4 py-3">Nội dung</th>
                <th className="px-4 py-3">Người dùng</th>
                <th className="px-4 py-3">Sản phẩm</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Ngày tạo</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={7} className="px-4 py-3.5">
                        <Skeleton className="h-6 w-full" />
                      </td>
                    </tr>
                  ))
                : reviews.map((r) => (
                    <tr key={r.id} className="transition-colors hover:bg-slate-50/60">
                      <td className="px-4 py-3.5">
                        <span className="flex items-center gap-1 font-semibold text-slate-900">
                          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                          {r.rating}/5
                        </span>
                      </td>
                      <td className="max-w-[280px] px-4 py-3.5">
                        <p className="line-clamp-2 text-slate-700">{r.comment || '—'}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-medium text-slate-800">{r.user?.fullName ?? '—'}</div>
                        <div className="text-xs text-slate-500">{r.user?.email ?? ''}</div>
                      </td>
                      <td className="max-w-[200px] truncate px-4 py-3.5 text-slate-700">
                        {r.product?.name ?? '—'}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            r.status === 'APPROVED'
                              ? 'bg-emerald-50 text-emerald-700'
                              : r.status === 'HIDDEN'
                                ? 'bg-slate-100 text-slate-600'
                                : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {STATUS_LABELS[r.status] ?? r.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-xs text-slate-500">
                        {formatDate(r.createdAt)}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex justify-end gap-2">
                          {r.status !== 'APPROVED' && (
                            <button
                              disabled={moderate.isPending}
                              onClick={() => setConfirming({ id: r.id, action: 'APPROVED' })}
                              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-40"
                            >
                              Duyệt
                            </button>
                          )}
                          {r.status !== 'HIDDEN' && (
                            <button
                              disabled={moderate.isPending}
                              onClick={() => setConfirming({ id: r.id, action: 'HIDDEN' })}
                              className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-40"
                            >
                              Ẩn
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
              {!isLoading && reviews.length === 0 && !isError && (
                <tr>
                  <td colSpan={7} className="px-4 py-8">
                    <EmptyState
                      title={status ? 'Không có đánh giá nào khớp bộ lọc' : 'Chưa có đánh giá nào'}
                      description={status ? 'Thử bỏ bớt điều kiện lọc.' : undefined}
                      actionLabel={status ? 'Xóa bộ lọc' : undefined}
                      onAction={() => updateQuery({ status: null, page: null })}
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <DialogLite
        open={Boolean(confirming)}
        onClose={() => setConfirming(null)}
        title={confirming?.action === 'APPROVED' ? 'Duyệt đánh giá?' : 'Ẩn đánh giá?'}
      >
        <p className="text-sm text-slate-700">
          {confirming?.action === 'APPROVED'
            ? 'Đánh giá sẽ hiển thị công khai trên trang sản phẩm.'
            : 'Đánh giá sẽ bị ẩn khỏi trang sản phẩm.'}
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirming(null)}>Hủy</Button>
          <Button
            variant={confirming?.action === 'HIDDEN' ? 'danger' : 'primary'}
            loading={moderate.isPending}
            onClick={() => confirming && runModerate(confirming.id, confirming.action)}
          >
            Xác nhận
          </Button>
        </div>
      </DialogLite>

      <Pagination page={page} totalPages={totalPages} onChange={(p) => updateQuery({ page: String(p) })} />
    </div>
  );
}
