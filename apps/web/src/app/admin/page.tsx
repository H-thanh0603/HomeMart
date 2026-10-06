'use client';

import Link from 'next/link';
import { AlertTriangle, Package, ShoppingCart, TrendingUp, Users, ShoppingBag } from 'lucide-react';
import { useAdminDashboardStats, useLowStock } from '@/hooks/use-admin';
import { formatCurrency } from '@/lib/utils';
import { buildAttentions } from '@/lib/admin-helpers';
import { OrderStatusBadge } from '@/components/ui/badge';
import { ErrorState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminDashboardPage() {
  const { data: stats, isLoading, isError, error, refetch } = useAdminDashboardStats();
  const { data: lowStock } = useLowStock();

  // Spec §4 Level 3: dashboard trả lời "có gì cần xử lý ngay?" (logic trong admin-helpers, có test).
  const attentions = buildAttentions(stats);

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
    {
      label: 'Khách hàng',
      value: stats ? String(stats.totalCustomers) : '—',
      icon: Users,
      tone: 'bg-violet-50 text-violet-600',
    },
    {
      label: 'Sản phẩm',
      value: stats ? String(stats.totalProducts) : '—',
      icon: ShoppingBag,
      tone: 'bg-slate-100 text-slate-600',
    },
  ];

  return (
    <div className="space-y-8">
      <h2 className="text-base font-bold text-slate-900">Tổng quan</h2>

      {isError && (
        <ErrorState
          message={`Không tải được số liệu: ${(error as Error)?.message}`}
          onRetry={() => refetch()}
        />
      )}

      {!isLoading && !isError && attentions.length > 0 && (
        <section aria-label="Cần xử lý ngay" className="rounded-2xl border border-amber-200/70 bg-amber-50/60 p-4">
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-amber-900">
            <AlertTriangle className="h-4 w-4" /> Cần xử lý ngay ({attentions.length})
          </h3>
          <ul className="flex flex-wrap gap-2">
            {attentions.map((a) => (
              <li key={a.key}>
                <Link
                  href={a.href}
                  className="inline-block rounded-xl bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 shadow-sm ring-1 ring-amber-200 hover:bg-amber-100"
                >
                  {a.label} →
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

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

      {/* Đơn gần đây */}
      {stats && stats.recentOrders.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Đơn gần đây</h3>
            <Link href="/admin/orders" className="text-xs font-semibold text-emerald-700 hover:underline">
              Xem tất cả →
            </Link>
          </div>
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            {stats.recentOrders.slice(0, 5).map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <Link href={`/admin/orders/${o.id}`} className="truncate text-sm font-semibold text-emerald-700 hover:underline">
                    {o.orderNumber}
                  </Link>
                  <p className="truncate text-xs text-slate-500">{o.contactName}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <OrderStatusBadge status={o.status} />
                  <span className="text-sm font-bold text-slate-900">{formatCurrency(Number(o.totalAmount))}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top sản phẩm */}
        {stats && stats.topProducts.length > 0 && (
          <section>
            <h3 className="mb-3 text-sm font-bold text-slate-900">Bán chạy nhất</h3>
            <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
              {stats.topProducts.slice(0, 5).map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <Link href={`/products/${p.slug}`} className="min-w-0 truncate text-sm font-semibold text-slate-800 hover:text-emerald-700">
                    {p.name}
                  </Link>
                  <span className="shrink-0 text-xs font-bold text-slate-500">
                    {p.soldCount} đã bán · {formatCurrency(Number(p.price))}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Voucher đang chạy */}
        {stats && stats.activeVouchers.length > 0 && (
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Voucher đang chạy</h3>
              <Link href="/admin/vouchers" className="text-xs font-semibold text-emerald-700 hover:underline">
                Quản lý →
              </Link>
            </div>
            <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
              {(stats.activeVouchers as { code: string; usedCount: number; usageLimit?: number | null }[]).slice(0, 5).map((v) => (
                <li key={v.code} className="flex items-center justify-between gap-3 px-4 py-3">
                  <span className="rounded-lg bg-emerald-50 px-2 py-1 font-mono text-xs font-bold text-emerald-700">
                    {v.code}
                  </span>
                  <span className="text-xs text-slate-500">
                    đã dùng {v.usedCount}{v.usageLimit ? `/${v.usageLimit}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
