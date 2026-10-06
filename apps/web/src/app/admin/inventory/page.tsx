'use client';

import { useState } from 'react';
import { useAdjustInventory, useLowStock } from '@/hooks/use-admin';
import { useAuthStore } from '@/stores/auth-store';
import { toast } from '@/stores/toast-store';
import type { LowStockRow } from '@/lib/admin-types';
import { Button } from '@/components/ui/button';
import { DialogLite } from '@/components/ui/dialog-lite';
import { EmptyState, ErrorState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminInventoryPage() {
  const { user } = useAuthStore();
  const isManager = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const { data: rows, isLoading, isError, error, refetch } = useLowStock();
  const adjust = useAdjustInventory();
  const [restocking, setRestocking] = useState<LowStockRow | null>(null);
  const [qty, setQty] = useState('10');

  const submitRestock = () => {
    const delta = Number(qty);
    if (!restocking || !Number.isInteger(delta) || delta <= 0) {
      toast.error('Số lượng nhập phải là số nguyên > 0');
      return;
    }
    adjust.mutate(
      { id: restocking.id, delta },
      {
        onSuccess: () => {
          toast.success(`Đã nhập +${delta} cho ${restocking.product?.name ?? restocking.productId}`);
          setRestocking(null);
        },
        onError: (e) => toast.error(e.message),
      },
    );
  };

  const cols = isManager ? 6 : 5;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-bold text-slate-900">Tồn kho sắp hết</h2>
        <p className="mt-1 text-sm text-slate-500">
          Hàng có sẵn ≤ 5 đơn vị, hết hàng xếp trước.
          {isManager ? ' Nhập kho trực tiếp từng dòng.' : ' Nhập kho cần quyền MANAGER/ADMIN.'}
        </p>
      </div>

      {isError && (
        <ErrorState
          message={`Không tải được: ${(error as Error).message}`}
          onRetry={() => refetch()}
        />
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Sản phẩm</th>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3 text-right">Sẵn có</th>
                <th className="px-4 py-3 text-right">Đang giữ</th>
                <th className="px-4 py-3 text-right">Đã bán</th>
                {isManager && <th className="px-4 py-3 text-right">Thao tác</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={cols} className="px-4 py-3.5">
                        <Skeleton className="h-6 w-full" />
                      </td>
                    </tr>
                  ))
                : rows?.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3.5 font-medium text-slate-800">
                        {row.product?.name ?? row.productId}
                        {row.variantId && (
                          <span className="ml-2 text-xs text-slate-400">(biến thể)</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-500">
                        {row.product?.sku ?? '—'}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                            row.availableStock === 0
                              ? 'bg-red-100 text-red-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {row.availableStock}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right text-slate-600">{row.reservedStock}</td>
                      <td className="px-4 py-3.5 text-right text-slate-600">{row.soldStock}</td>
                      {isManager && (
                        <td className="px-4 py-3.5 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setQty('10');
                              setRestocking(row);
                            }}
                          >
                            Nhập kho
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
              {!isLoading && (rows?.length ?? 0) === 0 && !isError && (
                <tr>
                  <td colSpan={cols} className="px-4 py-8">
                    <EmptyState
                      title="Tồn kho khỏe"
                      description="Không có mặt hàng nào sắp hết (≤ 5 đơn vị sẵn có)."
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <DialogLite
        open={Boolean(restocking)}
        onClose={() => setRestocking(null)}
        title={restocking ? `Nhập kho — ${restocking.product?.name ?? restocking.productId}` : 'Nhập kho'}
      >
        <p className="text-sm text-slate-700">
          Sẵn có hiện tại: <strong>{restocking?.availableStock}</strong>.
          Nhập số lượng cần cộng thêm (ghi ledger ADJUSTMENT, có audit).
        </p>
        <div className="mt-3">
          <label htmlFor="restock-qty" className="mb-1 block text-sm font-medium text-slate-700">Số lượng nhập</label>
          <input
            id="restock-qty"
            type="number"
            min={1}
            step={1}
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm shadow-sm outline-none focus:border-emerald-400"
          />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setRestocking(null)}>Hủy</Button>
          <Button loading={adjust.isPending} onClick={submitRestock}>
            Xác nhận nhập
          </Button>
        </div>
      </DialogLite>
    </div>
  );
}
