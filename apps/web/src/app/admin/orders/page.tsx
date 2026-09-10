'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import { useAdminOrders } from '@/hooks/use-admin';
import { formatCurrency, formatDate, ORDER_STATUS_LABELS } from '@/lib/utils';
import { OrderStatusBadge } from '@/components/ui/badge';
import { Pagination } from '@/components/ui/pagination';
import { Skeleton } from '@/components/ui/skeleton';

const STATUS_OPTIONS = Object.keys(ORDER_STATUS_LABELS);

export default function AdminOrdersPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const status = searchParams.get('status') ?? '';
  const q = searchParams.get('q') ?? '';
  const page = Number(searchParams.get('page') ?? '1') || 1;

  const [searchInput, setSearchInput] = useState(q);

  const { data, isLoading, isError, error } = useAdminOrders({
    page,
    ...(status ? { status } : {}),
    ...(q ? { q } : {}),
  });

  const totalPages = data?.meta?.totalPages ?? 1;
  const orders = data?.data ?? [];

  const updateQuery = useMemo(
    () =>
      (patch: Record<string, string | null>) => {
        const next = new URLSearchParams(searchParams.toString());
        for (const [k, v] of Object.entries(patch)) {
          if (v == null || v === '') next.delete(k);
          else next.set(k, v);
        }
        router.replace(`/admin/orders?${next.toString()}`);
      },
    [searchParams, router],
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-bold text-slate-900">
          Đơn hàng{data?.meta?.total != null ? ` (${data.meta.total})` : ''}
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
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Mã đơn, tên, SĐT…"
              className="h-10 w-56 rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm shadow-sm outline-none focus:border-emerald-400"
            />
          </form>
          <select
            value={status}
            onChange={(e) => updateQuery({ status: e.target.value || null, page: null })}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm outline-none focus:border-emerald-400"
          >
            <option value="">Tất cả trạng thái</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {ORDER_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isError && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          Không tải được danh sách: {(error as Error).message}
        </p>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Mã đơn</th>
                <th className="px-4 py-3">Khách</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Thanh toán</th>
                <th className="px-4 py-3 text-right">Tổng</th>
                <th className="px-4 py-3">Ngày tạo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={6} className="px-4 py-3.5">
                        <Skeleton className="h-6 w-full" />
                      </td>
                    </tr>
                  ))
                : orders.map((o) => {
                    const payment = o.payments?.[0];
                    return (
                      <tr key={o.id} className="transition-colors hover:bg-slate-50/60">
                        <td className="px-4 py-3.5">
                          <Link
                            href={`/admin/orders/${o.id}`}
                            className="font-semibold text-emerald-700 hover:underline"
                          >
                            {o.orderNumber}
                          </Link>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="font-medium text-slate-800">{o.contactName}</div>
                          <div className="text-xs text-slate-500">{o.contactPhone}</div>
                        </td>
                        <td className="px-4 py-3.5">
                          <OrderStatusBadge status={o.status} />
                        </td>
                        <td className="px-4 py-3.5">
                          {payment ? (
                            <div className="text-xs">
                              <div className="font-semibold text-slate-700">{payment.method}</div>
                              <div
                                className={
                                  payment.status === 'PAID'
                                    ? 'text-emerald-600'
                                    : payment.status === 'REFUNDED'
                                      ? 'text-red-600'
                                      : 'text-slate-500'
                                }
                              >
                                {payment.status}
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right font-semibold text-slate-900">
                          {formatCurrency(o.totalAmount)}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-500">
                          {formatDate(o.createdAt)}
                        </td>
                      </tr>
                    );
                  })}
              {!isLoading && orders.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-500">
                    Không có đơn hàng nào khớp bộ lọc.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination page={page} totalPages={totalPages} onChange={(p) => updateQuery({ page: String(p) })} />
    </div>
  );
}
