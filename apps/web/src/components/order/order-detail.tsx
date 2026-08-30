'use client';

import Image from 'next/image';
import Link from 'next/link';
import { CheckCircle2, Circle, Clock, MapPin, Package, XCircle } from 'lucide-react';
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
    <div className="space-y-5">
      {/* Trạng thái đơn hàng */}
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-xl font-black text-slate-900">Mã đơn #{order.orderNumber}</h1>
              <OrderStatusBadge status={order.status} />
            </div>
            <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <Clock className="h-3.5 w-3.5 text-slate-400" /> Đặt lúc {formatDate(order.createdAt)}
            </p>
          </div>
          {cancellable && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCancelOpen(true)}
              className="!border-red-200 !text-red-600 hover:!bg-red-50"
            >
              Huỷ đơn hàng
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Timeline tiến trình */}
      {history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4 text-emerald-600" /> Tiến trình xử lý đơn hàng
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            {!['CANCELLED', 'RETURNED', 'REFUNDED'].includes(order.status) && (
              <ol className="mb-6 flex flex-wrap gap-y-3" aria-label="Các bước giao hàng">
                {TRACK_STEPS.map((step, idx) => {
                  const isDone = idx <= currentStepIndex;
                  return (
                    <li key={step} className="flex flex-1 min-w-[90px] flex-col items-center text-center">
                      <span
                        className={cn(
                          'flex h-8 w-8 items-center justify-center rounded-full transition-colors',
                          isDone
                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
                            : 'bg-slate-100 text-slate-400',
                        )}
                      >
                        {isDone ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-3.5 w-3.5" />}
                      </span>
                      <span
                        className={cn(
                          'mt-1.5 px-1 text-xs font-semibold',
                          isDone ? 'text-emerald-800' : 'text-slate-400',
                        )}
                      >
                        {ORDER_STATUS_LABELS[step]}
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}

            <ul className="space-y-0 border-t border-slate-100 pt-4">
              {[...history].reverse().map((entry, i, arr) => (
                <li key={entry.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    {i === arr.length - 1 ? (
                      entry.toStatus === 'CANCELLED' ? (
                        <XCircle className="h-4 w-4 text-red-500" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      )
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                    )}
                    {i < arr.length - 1 && <span className="w-0.5 flex-1 bg-slate-200" />}
                  </div>
                  <div className={cn('pb-4', i === arr.length - 1 && 'pb-0')}>
                    <p className="text-sm font-bold text-slate-800">
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

      {/* Danh sách sản phẩm & Thông tin thanh toán */}
      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sản phẩm trong đơn ({order.items.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            <ul className="divide-y divide-slate-100">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-center gap-3.5 py-3.5 first:pt-0 last:pb-0">
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-50 ring-1 ring-slate-100">
                    {item.productImage && (
                      <Image src={item.productImage} alt={item.productName} fill sizes="64px" className="object-cover" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/products/${item.productId}`}
                      className="line-clamp-1 text-sm font-bold text-slate-800 hover:text-emerald-700"
                    >
                      {item.productName}
                    </Link>
                    {item.variantAttributes && Object.keys(item.variantAttributes).length > 0 && (
                      <p className="text-xs text-slate-400">
                        {Object.entries(item.variantAttributes).map(([k, v]) => `${k}: ${v}`).join(', ')}
                      </p>
                    )}
                    <p className="text-xs text-slate-400 mt-0.5">
                      {formatCurrency(item.unitPrice)} × {item.quantity}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-extrabold text-accent-600">
                    {formatCurrency(item.lineTotal)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-xs">
              <p className="font-bold text-slate-900 flex items-center gap-1.5 mb-1">
                <MapPin className="h-3.5 w-3.5 text-emerald-600" /> Địa chỉ giao đến:
              </p>
              <p className="font-semibold text-slate-700">
                {order.contactName} • {order.contactPhone}
              </p>
              <p className="text-slate-500 mt-0.5 leading-relaxed">
                {[order.shippingLine, order.shippingWard, order.shippingDistrict, order.shippingProvince].join(', ')}
              </p>
              {order.note && <p className="mt-1.5 italic text-slate-500 border-t border-slate-200/60 pt-1.5">Ghi chú: {order.note}</p>}
            </div>
          </CardContent>
        </Card>

        <aside aria-label="Chi tiết thanh toán">
          <Card className="sticky top-28">
            <CardHeader>
              <CardTitle className="text-base">Chi tiết thanh toán</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-5 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Tạm tính</span>
                <span className="font-medium">{formatCurrency(order.subtotalAmount)}</span>
              </div>
              {order.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Giảm giá{order.voucherCode ? ` (${order.voucherCode})` : ''}</span>
                  <span>-{formatCurrency(order.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>Phí vận chuyển</span>
                <span className="font-medium">{formatCurrency(order.shippingFee)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Thuế VAT</span>
                <span className="font-medium">{formatCurrency(order.taxAmount)}</span>
              </div>
              <div className="flex items-baseline justify-between border-t border-dashed border-slate-200 pt-3 text-base font-black text-slate-900">
                <span>Tổng tiền</span>
                <span className="text-lg text-accent-600">{formatCurrency(order.totalAmount)}</span>
              </div>
              {(order.payments?.[0]?.method ?? order.paymentMethod) && (
                <p className="pt-2 text-xs text-slate-400 border-t border-slate-100">
                  Phương thức: <strong className="text-slate-700">{order.payments?.[0]?.method ?? order.paymentMethod}</strong>
                </p>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>

      {/* Dialog huỷ đơn */}
      <DialogLite open={cancelOpen} onClose={() => setCancelOpen(false)} title={`Huỷ đơn hàng #${order.orderNumber}`}>
        <div className="space-y-3.5">
          <label htmlFor="cancel-reason" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
            Lý do huỷ đơn (không bắt buộc)
          </label>
          <textarea
            id="cancel-reason"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            rows={3}
            maxLength={500}
            className="w-full rounded-2xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/15"
            placeholder="Ví dụ: Đặt nhầm sản phẩm, muốn đổi địa chỉ..."
          />
          <div className="flex justify-end gap-2 pt-2">
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
              Xác nhận huỷ đơn
            </Button>
          </div>
        </div>
      </DialogLite>
    </div>
  );
}
