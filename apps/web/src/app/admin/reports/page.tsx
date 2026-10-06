'use client';

import { useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useRevenueReport, useSoftLaunch, useTopCategories } from '@/hooks/use-admin';
import { formatCurrency } from '@/lib/utils';
import { ApiError } from '@/lib/api';
import { ErrorState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function defaultRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 29);
  return { from: toISODate(from), to: toISODate(to) };
}

function GateBadge({ pass }: { pass: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
        pass ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
      }`}
    >
      {pass ? 'Đạt' : 'Chưa đạt'}
    </span>
  );
}

export default function AdminReportsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const defaults = useMemo(() => defaultRange(), []);

  const from = searchParams.get('from') ?? defaults.from;
  const to = searchParams.get('to') ?? defaults.to;
  const groupBy = (searchParams.get('groupBy') === 'month' ? 'month' : 'day') as 'day' | 'month';

  const updateQuery = useMemo(
    () =>
      (patch: Record<string, string | null>) => {
        const next = new URLSearchParams(searchParams.toString());
        for (const [k, v] of Object.entries(patch)) {
          if (v == null || v === '') next.delete(k);
          else next.set(k, v);
        }
        router.replace(`/admin/reports?${next.toString()}`);
      },
    [searchParams, router],
  );

  const revenue = useRevenueReport({ from, to, groupBy });
  const topCats = useTopCategories({ from, to });
  // Soft-launch: MANAGER+ mới xem được — STAFF dính 403 thì ẩn section.
  const softLaunch = useSoftLaunch({ from, to });
  const softLaunchForbidden = (softLaunch.error as ApiError | null)?.status === 403;

  const revenueData = revenue.data ?? [];
  const categories = topCats.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-bold text-slate-900">Báo cáo doanh thu</h2>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-sm text-slate-600">
            Từ
            <input
              type="date"
              value={from}
              max={to}
              onChange={(e) => updateQuery({ from: e.target.value || null })}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm outline-none focus:border-emerald-400"
            />
          </label>
          <label className="flex items-center gap-1.5 text-sm text-slate-600">
            Đến
            <input
              type="date"
              value={to}
              min={from}
              onChange={(e) => updateQuery({ to: e.target.value || null })}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm outline-none focus:border-emerald-400"
            />
          </label>
          <select
            value={groupBy}
            onChange={(e) => updateQuery({ groupBy: e.target.value })}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm outline-none focus:border-emerald-400"
          >
            <option value="day">Theo ngày</option>
            <option value="month">Theo tháng</option>
          </select>
        </div>
      </div>

      {revenue.isError && (
        <ErrorState
          message={`Không tải được doanh thu: ${(revenue.error as Error).message}`}
          onRetry={() => revenue.refetch()}
        />
      )}

      {/* Biểu đồ doanh thu — line cho time-series (spec data-viz: line cho xu hướng, không pie) */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-sm font-bold text-slate-900">Doanh thu theo kỳ</h3>
          {/* Spec time-range: số liệu luôn kèm khoảng đang xem */}
          <p className="text-xs text-slate-500">Khoảng: {from} → {to} · theo {groupBy === 'month' ? 'tháng' : 'ngày'}</p>
        </div>
        <p className="mb-4 text-xs text-slate-400">Đơn CANCELLED đã loại · không gồm đơn đã xóa</p>
        {revenue.isLoading ? (
          <Skeleton className="h-72 w-full rounded-xl" />
        ) : revenueData.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-500">Không có dữ liệu trong khoảng đã chọn.</p>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="period" tick={{ fontSize: 12 }} tickLine={false} minTickGap={24} />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  tickFormatter={(v: number) =>
                    new Intl.NumberFormat('vi-VN', { notation: 'compact' }).format(v)
                  }
                />
                <Tooltip formatter={(v) => [formatCurrency(Number(v)), 'Doanh thu']} labelFormatter={(l) => `Kỳ: ${l}`} />
                <Area type="monotone" dataKey="revenue" stroke="#059669" fill="#a7f3d0" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* Biểu đồ số đơn — bar cho so sánh theo kỳ */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-sm font-bold text-slate-900">Số đơn theo kỳ</h3>
          <p className="text-xs text-slate-500">Khoảng: {from} → {to}</p>
        </div>
        {revenue.isLoading ? (
          <Skeleton className="h-72 w-full rounded-xl" />
        ) : revenueData.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-500">Không có dữ liệu trong khoảng đã chọn.</p>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="period" tick={{ fontSize: 12 }} tickLine={false} minTickGap={24} />
                <YAxis tick={{ fontSize: 12 }} tickLine={false} allowDecimals={false} />
                <Tooltip labelFormatter={(l) => `Kỳ: ${l}`} />
                <Bar dataKey="orders" name="Số đơn" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* Top categories */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-bold text-slate-900">Danh mục bán chạy</h3>
        {topCats.isError && (
          <div className="mb-3">
            <ErrorState
              message={`Không tải được top danh mục: ${(topCats.error as Error).message}`}
              onRetry={() => topCats.refetch()}
            />
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Danh mục</th>
                <th className="px-4 py-3 text-right">Doanh thu</th>
                <th className="px-4 py-3 text-right">Đã bán</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {topCats.isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={3} className="px-4 py-3.5">
                        <Skeleton className="h-6 w-full" />
                      </td>
                    </tr>
                  ))
                : categories.map((c) => (
                    <tr key={c.name} className="transition-colors hover:bg-slate-50/60">
                      <td className="px-4 py-3.5 font-medium text-slate-800">{c.name}</td>
                      <td className="px-4 py-3.5 text-right font-semibold text-slate-900">
                        {formatCurrency(c.revenue)}
                      </td>
                      <td className="px-4 py-3.5 text-right text-slate-600">{c.units}</td>
                    </tr>
                  ))}
              {!topCats.isLoading && categories.length === 0 && !topCats.isError && (
                <tr>
                  <td colSpan={3} className="px-4 py-12 text-center text-sm text-slate-500">
                    Không có dữ liệu trong khoảng đã chọn.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Soft-launch gates — chỉ MANAGER+, 403 thì ẩn */}
      {!softLaunchForbidden && (
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Soft-launch gates</h3>
            {softLaunch.data && <GateBadge pass={softLaunch.data.gates.allPass} />}
          </div>
          {softLaunch.isLoading ? (
            <div className="grid gap-3 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-xl" />
              ))}
            </div>
          ) : softLaunch.isError || !softLaunch.data ? (
            <ErrorState
              message={`Không tải được soft-launch: ${(softLaunch.error as Error)?.message}`}
              onRetry={() => softLaunch.refetch()}
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-3">
              {(
                [
                  { label: 'Tỉ lệ checkout thành công', value: softLaunch.data.metrics.checkoutSuccessRate, pass: softLaunch.data.gates.checkout },
                  { label: 'Tỉ lệ giao đúng hạn', value: softLaunch.data.metrics.onTimeRate, pass: softLaunch.data.gates.onTime },
                  { label: 'Tỉ lệ trả hàng', value: softLaunch.data.metrics.returnRate, pass: softLaunch.data.gates.returns },
                ] as const
              ).map((m) => (
                <div key={m.label} className="rounded-xl border border-slate-200 p-4">
                  <p className="text-xs font-medium text-slate-500">{m.label}</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    {(m.value * 100).toFixed(1)}%
                  </p>
                  <div className="mt-2">
                    <GateBadge pass={m.pass} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
