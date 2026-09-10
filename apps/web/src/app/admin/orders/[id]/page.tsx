'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Ban, CheckCircle2, RefreshCcw } from 'lucide-react';
import {
  useAdminOrder,
  useConfirmCod,
  useRefundGateway,
  useUpdateOrderStatus,
} from '@/hooks/use-admin';
import { useAuthStore } from '@/stores/auth-store';
import { formatCurrency, formatDate, ORDER_STATUS_LABELS } from '@/lib/utils';
import { OrderStatusBadge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MANAGER_ONLY_ACTIONS, NEXT_STATUS_OPTIONS } from '@/lib/admin-types';

export default function AdminOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const orderId = params.id;
  const { data: order, isLoading, isError, error } = useAdminOrder(orderId);
  const { user } = useAuthStore();

  const updateStatus = useUpdateOrderStatus();
  const confirmCod = useConfirmCod();
  const refund = useRefundGateway();

  const [note, setNote] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null); // action đang chờ confirm

  const isManager = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const runAction = (fn: () => Promise<unknown>, key: string) => {
    setActionError(null);
    setConfirming(null);
    fn().catch((e: Error) => setActionError(e.message));
    void key;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="space-y-4">
        <BackLink />
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          Không tải được đơn: {(error as Error)?.message}
        </p>
      </div>
    );
  }

  const nextOptions = NEXT_STATUS_OPTIONS[order.status] ?? [];
  const paidPayment = order.payments?.find((p) => p.status === 'PAID');
  const hasGatewayPayment = paidPayment && paidPayment.method !== 'COD';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <BackLink />
          <h2 className="text-base font-bold text-slate-900">{order.orderNumber}</h2>
          <OrderStatusBadge status={order.status} />
        </div>
        <span className="text-xs text-slate-500">
          Tạo {formatDate(order.createdAt)}
        </span>
      </div>

      {actionError && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {actionError}
        </p>
      )}
      {updateStatus.isError && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          Chuyển trạng thái thất bại: {(updateStatus.error as Error)?.message}
        </p>
      )}

      {/* Actions */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <h3 className="mb-3 text-sm font-bold text-slate-900">Thao tác</h3>
        {nextOptions.length === 0 ? (
          <p className="text-sm text-slate-500">
            Đơn ở trạng thái cuối — không chuyển được nữa.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {nextOptions.map((next) => {
                const managerOnly = MANAGER_ONLY_ACTIONS.includes(next);
                const disabled =
                  updateStatus.isPending || (managerOnly && !isManager);
                const isCancel = next === 'CANCELLED';
                return (
                  <button
                    key={next}
                    disabled={disabled}
                    onClick={() => setConfirming(next)}
                    title={managerOnly && !isManager ? 'Chỉ MANAGER/ADMIN' : undefined}
                    className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                      isCancel
                        ? 'border border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
                        : 'bg-emerald-600 text-white hover:bg-emerald-700'
                    }`}
                  >
                    {isCancel ? <Ban className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                    → {ORDER_STATUS_LABELS[next] ?? next}
                  </button>
                );
              })}
            </div>
            {confirming && (
              <div className="mt-4 space-y-3 rounded-xl border border-amber-200 bg-amber-50/60 p-4">
                <p className="text-sm font-medium text-amber-900">
                  Xác nhận chuyển{' '}
                  <strong>{ORDER_STATUS_LABELS[order.status]}</strong> →{' '}
                  <strong>{ORDER_STATUS_LABELS[confirming]}</strong>?
                </p>
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ghi chú (không bắt buộc)"
                  className="h-10 w-full max-w-md rounded-xl border border-amber-200 bg-white px-3 text-sm outline-none focus:border-amber-400"
                />
                <div className="flex gap-2">
                  <button
                    disabled={updateStatus.isPending}
                    onClick={() =>
                      runAction(
                        () =>
                          updateStatus.mutateAsync({
                            id: order.id,
                            status: confirming,
                            note: note || undefined,
                          }),
                        confirming,
                      )
                    }
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-40"
                  >
                    {updateStatus.isPending ? 'Đang lưu…' : 'Xác nhận'}
                  </button>
                  <button
                    onClick={() => setConfirming(null)}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Hủy
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
          {order.status === 'DELIVERED' && order.payments?.some((p) => p.method === 'COD' && p.status !== 'PAID') && (
            <button
              disabled={confirmCod.isPending}
              onClick={() =>
                runAction(
                  () => confirmCod.mutateAsync({ id: order.id, note: note || undefined }),
                  'cod',
                )
              }
              className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-40"
            >
              {confirmCod.isPending ? 'Đang ghi…' : 'Xác nhận COD đã thu tiền'}
            </button>
          )}
          {isManager && (order.status === 'RETURNED' || order.status === 'RETURN_REQUESTED') && hasGatewayPayment && (
            <button
              disabled={refund.isPending}
              onClick={() =>
                runAction(
                  () => refund.mutateAsync({ id: order.id }),
                  'refund',
                )
              }
              className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-40"
            >
              <RefreshCcw className="h-4 w-4" />
              {refund.isPending ? 'Đang hoàn…' : 'Hoàn tiền qua gateway'}
            </button>
          )}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Khách + giao hàng */}
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-bold text-slate-900">Khách & giao hàng</h3>
          <dl className="space-y-2 text-sm">
            <Row label="Tên" value={order.contactName} />
            <Row label="SĐT" value={order.contactPhone} />
            {order.user && <Row label="Email" value={order.user.email} />}
            <Row
              label="Địa chỉ"
              value={`${order.shippingLine}, ${order.shippingWard}, ${order.shippingDistrict}, ${order.shippingProvince}`}
            />
            {order.shipment && (
              <>
                <Row label="Vận chuyển" value={order.shipment.method?.name ?? '—'} />
                {order.shipment.trackingCode && (
                  <Row label="Mã vận đơn" value={order.shipment.trackingCode} />
                )}
              </>
            )}
            {order.note && <Row label="Ghi chú khách" value={order.note} />}
          </dl>
        </section>

        {/* Thanh toán */}
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-bold text-slate-900">Thanh toán</h3>
          {order.payments && order.payments.length > 0 ? (
            <ul className="space-y-2 text-sm">
              {order.payments.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2">
                  <div>
                    <div className="font-semibold text-slate-800">{p.method}</div>
                    <div className="text-xs text-slate-500">{p.providerRef ?? ''}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-slate-900">{formatCurrency(p.amountVnd)}</div>
                    <div className={`text-xs font-medium ${p.status === 'PAID' ? 'text-emerald-600' : 'text-slate-500'}`}>
                      {p.status}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">Chưa có bản ghi thanh toán.</p>
          )}
          <dl className="mt-4 space-y-1.5 border-t border-slate-100 pt-3 text-sm">
            <Row label="Tạm tính" value={formatCurrency(order.subtotalAmount)} />
            <Row label="Giảm giá" value={`- ${formatCurrency(order.discountAmount)}`} />
            <Row label="Phí ship" value={formatCurrency(order.shippingFee)} />
            <div className="flex justify-between pt-1.5 text-base font-bold text-slate-900">
              <dt>Tổng</dt>
              <dd>{formatCurrency(order.totalAmount)}</dd>
            </div>
          </dl>
        </section>
      </div>

      {/* Items */}
      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <h3 className="border-b border-slate-100 px-5 py-4 text-sm font-bold text-slate-900">
          Sản phẩm ({order.items?.length ?? 0})
        </h3>
        <ul className="divide-y divide-slate-100">
          {order.items?.map((it) => (
            <li key={it.id} className="flex items-center justify-between gap-3 px-5 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-800">{it.productName}</p>
                <p className="text-xs text-slate-500">
                  SKU {it.sku} · {formatCurrency(it.unitPrice)} × {it.quantity}
                </p>
              </div>
              <span className="shrink-0 text-sm font-bold text-slate-900">
                {formatCurrency(it.lineTotal)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* Status history */}
      {order.statusHistory && order.statusHistory.length > 0 && (
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-bold text-slate-900">Lịch sử trạng thái</h3>
          <ol className="space-y-2.5">
            {order.statusHistory.map((h) => (
              <li key={h.id} className="flex items-start gap-3 text-sm">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                <div>
                  <span className="font-semibold text-slate-800">
                    {h.fromStatus ? `${ORDER_STATUS_LABELS[h.fromStatus] ?? h.fromStatus} → ` : ''}
                    {ORDER_STATUS_LABELS[h.toStatus] ?? h.toStatus}
                  </span>
                  <span className="ml-2 text-xs text-slate-400">{formatDate(h.createdAt)}</span>
                  {h.note && <p className="text-xs text-slate-500">↳ {h.note}</p>}
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/admin/orders"
      className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 shadow-sm hover:bg-slate-50"
    >
      <ArrowLeft className="h-4 w-4" /> Đơn hàng
    </Link>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4">
      <dt className="shrink-0 text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-800">{value}</dd>
    </div>
  );
}
