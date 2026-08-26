'use client';

import Link from 'next/link';
import { CheckCircle2, Circle, XCircle } from 'lucide-react';
import { useState } from 'react';
import { useCancelOrder, useOrder } from '@/hooks/use-orders';
import { Button } from '@/components/ui/button';
import { OrderStatusBadge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ListSkeleton } from '@/components/ui/skeleton';
import { ErrorState, EmptyState } from '@/components/ui/empty-state';
import { DialogLite } from '@/components/ui/dialog-lite';
import { cn, formatCurrency, formatDate, isCancellable, ORDER_STATUS_LABELS } from '@/lib/utils';
import type { OrderStatus } from '@/lib/types';
import { toast } from '@/stores/toast-store';

/** Các bước hiển thị trên timeline rút gọn. */
const TRACK_STEPS: OrderStatus[] = [
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'PACKING',
  'SHIPPED',
  'DELIVERED',
];

export function OrderDetail({ orderId }: { orderId: string }) {
  const query = useOrder(orderId);
  const cancel = useCancelOrder();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  if (query.isLoading) {
    return (
      <div className="space-y-4">
        <ListSkeleton rows={3} />
        <ListSkeleton rows={2} />
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="py-8">
        <ErrorState message="Không thể tải đơn hàng" onRetry={() => query.refetch()} />
      </div>
    );
  }

  const order = query.data;
  if (!order) return <EmptyState title="Không tìm thấy đơn hàng" href="/account/orders" actionLabel="Xem đơn hàng" />;

  const cancellable = isCancellable(order.status);
  const history = order.statusHistory ?? [];

  const currentStepIndex =
    order.status === 'CANCELLED'
      ? -1
      : [...TRACK_STEPS].reverse().find((s) => history.some((h) => h.toStatus === s)) !== undefined
        ? TRACK_STEPS.indexOf(
            [...TRACK_STEPS].reverse().find((s) => history.some((h) => h.toStatus === s))!,
          )
        : TRACK_STEPS.indexOf('PENDING');

  return (
    <div className="space-y-4">
      {/* Trạng thái */}
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900">Đơn hàng {order.orderNumber}</h1>
              <OrderStatusBadge status={order.status} />
            </div>
            <p className="mt-1 text-xs text-slate-400">Đặt lúc {formatDate(order.createdAt)}</p>
          </div>
          {cancellable && (
            <Button variant="outline" onClick={() => setCancelOpen(true)} className="!border-red-200 !text-red-600 hover:!bg-red-50">
              Huỷ đơn hàng
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Timeline */}
      {history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Tiến trình đơn hàng</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Steps rút gọn cho trạng thái giao thông thường */}
            {!['CANCELLED', 'RETURNED', 'REFUNDED'].includes(order.status) && (
              <ol className="mb-5 flex flex-wrap gap-y-2" aria-label="Các bước giao hàng">
                {TRACK_STEPS.map((step, idx) => (
                  <li key={step} className="flex flex-1 min-w-[90px] flex-col items-center text-center">
                    <span
                      className={cn(
                        'flex h-7 w-7 items-center justify-center rounded-full',
                        idx <= currentStepIndex ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-400',
                      )}
                    >
                      {idx <= currentStepIndex ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-3 w-3" />}
                    </span>
                    <span className={cn('mt-1 px-1 text-[11px]', idx <= currentStepIndex ? 'font-medium text-primary-700' : 'text-slate-400')}>
                      {ORDER_STATUS_LABELS[step]}
                    </span>
                  </li>
                ))}
              </ol>
            )}

            <ul className="space-y-0">
              {[...history].reverse().map((entry, i, arr) => (
                <li key={entry.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    {i === arr.length - 1 ? (
                      entry.toStatus === 'CANCELLED' ? (
                        <XCircle className="h-4 w-4 text-red-500" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-primary-600" />
                      )
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-primary-300" />
                    )}
                    {i < arr.length - 1 && <span className="w-px flex-1 bg-slate-200" />}
                  </div>
                  <div className={cn('pb-4', i === arr.length - 1 && 'pb-0')}>
                    <p className="text-sm font-medium text-slate-700">
                      {entry.fromStatus && `${ORDER_STATUS_LABELS[entry.fromStatus]} → `}
                      {ORDER_STATUS_LABELS[entry.toStatus]}
                    </p>
                    <p className="text-xs text-slate-400">{formatDate(entry.createdAt)}</p>
                    {entry.note && <p className="mt-0.5 text-xs italic text-slate-500">{entry.note}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Sản phẩm + tiền */}
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader>
            <CardTitle>Sản phẩm ({order.items.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-slate-100">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-center gap-3 py-3">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-slate-50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {item.productImage && (
                      <img src={item.productImage} alt={item.productName} className="h-full w-full object-cover" loading="lazy" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link href={`/products/${item.productId}`} className="line-clamp-1 text-sm font-medium text-slate-700 hover:text-primary-700">
                      {item.productName}
                    </Link>
                    {item.variantAttributes && Object.keys(item.variantAttributes).length > 0 && (
                      <p className="text-xs text-slate-400">
                        {Object.entries(item.variantAttributes).map(([k, v]) => `${k}: ${v}`).join(', ')}
                      </p>
                    )}
                    <p className="text-xs text-slate-400">
                      {formatCurrency(item.unitPrice)} × {item.quantity}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-accent-600">
                    {formatCurrency(item.lineTotal)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm">
              <p className="font-medium text-slate-700">Giao đến</p>
              <p className="text-xs text-slate-500">
                {order.contactName} · {order.contactPhone}
              </p>
              <p className="text-xs text-slate-500">
                {[order.shippingLine, order.shippingWard, order.shippingDistrict, order.shippingProvince].join(', ')}
              </p>
              {order.note && <p className="mt-1 text-xs italic text-slate-500">Ghi chú: {order.note}</p>}
            </div>
          </CardContent>
        </Card>

        <aside aria-label="Chi tiết thanh toán">
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle>Thanh toán</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 text-sm p-4">
              <div className="flex justify-between text-slate-600">
                <span>Tạm tính</span>
                <span>{formatCurrency(order.subtotalAmount)}</span>
              </div>
              {order.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Giảm giá{order.voucherCode ? ` (${order.voucherCode})` : ''}</span>
                  <span>-{formatCurrency(order.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>Phí vận chuyển</span>
                <span>{formatCurrency(order.shippingFee)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Thuế</span>
                <span>{formatCurrency(order.taxAmount)}</span>
              </div>
              <div className="flex justify-between border-t border-dashed border-slate-200 pt-2 text-base font-bold">
                <span>Tổng cộng</span>
                <span className="text-accent-600">{formatCurrency(order.totalAmount)}</span>
              </div>
              {(order.payments?.[0]?.method ?? order.paymentMethod) && (
                <p className="pt-1 text-xs text-slate-400">
                  Phương thức: {order.payments?.[0]?.method ?? order.paymentMethod}
                </p>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>

      {/* Dialog huỷ đơn */}
      <DialogLite open={cancelOpen} onClose={() => setCancelOpen(false)} title={`Huỷ đơn ${order.orderNumber}`}>
        <div className="space-y-3">
          <label htmlFor="cancel-reason" className="block text-sm text-slate-600">
            Lý do huỷ đơn (không bắt buộc)
          </label>
          <textarea
            id="cancel-reason"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            rows={3}
            maxLength={500}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
            placeholder="VD: Đặt nhầm sản phẩm..."
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setCancelOpen(false)}>
              Để nguyên
            </Button>
            <Button
              variant="danger"
              loading={cancel.isPending}
              onClick={() =>
                cancel.mutate(
                  { id: order.id, reason: cancelReason.trim() || undefined },
                  {
                    onSuccess: () => {
                      setCancelOpen(false);
                      toast.success('Đã huỷ đơn hàng');
                    },
                    onError: (err) => toast.error(err.message),
                  },
                )
              }
            >
              Xác nhận huỷ
            </Button>
          </div>
        </div>
      </DialogLite>
    </div>
  );
}
