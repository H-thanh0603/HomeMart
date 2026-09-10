'use client';

import { useLowStock } from '@/hooks/use-admin';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminInventoryPage() {
  const { data: rows, isLoading, isError, error } = useLowStock();

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-bold text-slate-900">Tồn kho sắp hết</h2>
        <p className="mt-1 text-sm text-slate-500">
          Hàng có sẵn ≤ 5 đơn vị. Nhập thêm qua admin API{' '}
          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">
            POST /admin/inventory/:id/adjust
          </code>
          .
        </p>
      </div>

      {isError && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          Không tải được: {(error as Error).message}
        </p>
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
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={5} className="px-4 py-3.5">
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
                    </tr>
                  ))}
              {!isLoading && (rows?.length ?? 0) === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-sm text-slate-500">
                    Không có hàng nào sắp hết — tồn kho khỏe.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
