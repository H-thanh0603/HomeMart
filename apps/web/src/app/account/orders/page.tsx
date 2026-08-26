'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { PackageOpen } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useOrders } from '@/hooks/use-orders';
import { OrderStatusBadge } from '@/components/ui/badge';
import { ListSkeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/empty-state';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function AccountOrdersPage() {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const hydrated = useAuthStore((s) => s.hydrated);
  const ordersQuery = useOrders();

  useEffect(() => {
    if (hydrated && !accessToken) {
      router.replace('/auth/login?redirect=/account/orders');
    }
  }, [hydrated, accessToken, router]);

  if (!hydrated || !accessToken) return <ListSkeleton rows={4} />;

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold text-slate-900">Đơn hàng của tôi</h1>

      {ordersQuery.isLoading ? (
        <ListSkeleton rows={4} />
      ) : ordersQuery.isError ? (
        <ErrorState onRetry={() => ordersQuery.refetch()} />
      ) : (ordersQuery.data?.data ?? []).length === 0 ? (
        <EmptyState
          icon={<PackageOpen className="h-12 w-12" />}
          title="Chưa có đơn hàng nào"
          description="Khi bạn đặt hàng, đơn sẽ hiển thị tại đây."
          actionLabel="Bắt đầu mua sắm"
          href="/products"
        />
      ) : (
        <ul className="space-y-3">
          {(ordersQuery.data?.data ?? []).map((order) => (
            <li key={order.id}>
              <Link
                href={`/account/orders/${order.id}`}
                className="block rounded-xl bg-white p-4 shadow-card ring-1 ring-slate-100 transition-shadow hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{order.orderNumber}</p>
                    <p className="text-xs text-slate-400">{formatDate(order.createdAt)}</p>
                  </div>
                  <OrderStatusBadge status={order.status} />
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <p className="line-clamp-1 text-xs text-slate-500">
                    {order.items.length > 0 && order.items[0].productName}
                    {order.items.length > 1 && ` +${order.items.length - 1} sản phẩm khác`}
                  </p>
                  <div className="flex shrink-0 items-baseline gap-2">
                    <span className="text-sm font-bold text-accent-600">
                      {formatCurrency(order.totalAmount)}
                    </span>
                    <span className="text-sm font-medium text-primary-700">Chi tiết →</span>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
