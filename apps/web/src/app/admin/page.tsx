'use client';

import Link from 'next/link';
import { AlertTriangle, Package, ShoppingCart, TrendingUp } from 'lucide-react';
import { useAdminDashboardStats, useLowStock } from '@/hooks/use-admin';
import { formatCurrency, ORDER_STATUS_LABELS } from '@/lib/utils';
import { OrderStatusBadge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminDashboardPage() {
  const { data: stats, isLoading } = useAdminDashboardStats();
  const { data: lowStock } = useLowStock();

  const cards = [
    {
      label: 'Doanh thu hôm nay',
      value: stats ? formatCurrency(Number(stats.todayRevenue)) : '—',
      icon: TrendingUp,
      tone: 'bg-emerald-50 text-emerald-600',
    },
    {
      label: 'Doanh thu tháng này',
      value: stats ? formatCurrency(Number(stats.monthRevenue)) : '—',
      icon: TrendingUp,
      tone: 'bg-emerald-50 text-emerald-600',
    },
    {
      label: 'Tổng đơn hàng',
      value: stats ? String(stats.totalOrders) : '—',
      icon: ShoppingCart,
      tone: 'bg-sky-50 text-sky-600',
    },
    {
      label: 'Đơn PENDING chờ xử lý',
      value: stats ? String(stats.pendingOrders) : '—',
      icon: Package,
      tone: 'bg-amber-50 text-amber-600',
    },
  ];

  return (
    <div className="space-y-8">
      <h2 className="text-base font-bold text-slate-900">Tổng quan</h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, tone }) => (
          <div
            key={label}
            className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}>
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-500">{label}</p>
                {isLoading ? (
                  <Skeleton className="mt-1 h-6 w-24" />
                ) : (
                  <p className="truncate text-xl font-bold tracking-tight text-slate-900">
                    {value}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Theo trạng thái */}
      {stats && stats.statusBreakdown.length > 0 && (
        <section>
          <h3 className="mb-3 text-sm font-bold text-slate-900">Đơn theo trạng thái</h3>
          <div className="flex flex-wrap gap-2">
            {stats.statusBreakdown.map(({ status, count }) => (
              <Link
                key={status}
                href={`/admin/orders?status=${status}`}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm hover:border-emerald-300"
              >
                <OrderStatusBadge status={status} />
                <span className="text-sm font-bold text-slate-900">{count}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Low stock preview */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">
            Tồn kho sắp hết{stats ? ` (${stats.lowStockCount})` : ''}
          </h3>
          <Link href="/admin/inventory" className="text-xs font-semibold text-emerald-700 hover:underline">
            Xem tất cả →
          </Link>
        </div>
        {lowStock && lowStock.length > 0 ? (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            {lowStock.slice(0, 5).map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800">
                    {row.product?.name ?? row.productId}
                  </p>
                  <p className="text-xs text-slate-500">
                    SKU: {row.product?.sku ?? '—'}
                    {row.variantId ? ' · theo biến thể' : ''}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${
                    (row.availableStock ?? 0) === 0
                      ? 'bg-red-100 text-red-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {row.availableStock} sẵn có · {row.reservedStock} giữ
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-6 text-center text-sm text-slate-500">
            Không có sản phẩm sắp hết hàng.
          </p>
        )}
      </section>
    </div>
  );
}
