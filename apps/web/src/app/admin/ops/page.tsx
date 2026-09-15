'use client';

import { useState } from 'react';
import { Clock, FileCheck2, Upload } from 'lucide-react';
import { useExpirePending, useReconcile, useReconcileReport } from '@/hooks/use-admin';
import { useAuthStore } from '@/stores/auth-store';

export default function AdminOpsPage() {
  const { user } = useAuthStore();
  const isManager = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const expirePending = useExpirePending();
  const reconcile = useReconcile();
  const report = useReconcileReport();

  const [expireResult, setExpireResult] = useState<string | null>(null);
  const [reconcileResult, setReconcileResult] = useState<string | null>(null);
  const [reportProvider, setReportProvider] = useState<'VNPAY' | 'MOMO'>('VNPAY');
  const [reportResult, setReportResult] = useState<string | null>(null);

  if (!isManager) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-8 text-center">
        <p className="text-sm font-medium text-amber-800">
          Trang vận hành chỉ dành cho MANAGER/ADMIN (endpoint ops có Roles() guard phía server).
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-bold text-slate-900">Vận hành</h2>
        <p className="mt-1 text-sm text-slate-500">
          Các job này đã có cron tự chạy trong prod (docker/cron-ops.sh) — nút ở đây
          để chạy tay khi cần (kiểm tra sau deploy, xử lý sự cố).
        </p>
      </div>

      {/* Expire pending */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Clock className="h-4 w-4 text-amber-500" /> Hết hạn đơn PENDING
            </h3>
            <p className="mt-1 max-w-xl text-sm text-slate-500">
              Đơn PENDING quá <code className="rounded bg-slate-100 px-1 text-xs">ORDER_PAYMENT_TIMEOUT_MINUTES</code>{' '}
              sẽ bị hủy + giải phóng kho + hủy payment giữ chỗ. Cron chạy 5 phút/lần —
              chạy tay khi vừa bật cron hoặc nghi ngờ đơn kẹt.
            </p>
          </div>
          <button
            disabled={expirePending.isPending}
            onClick={async () => {
              try {
                const r = await expirePending.mutateAsync();
                setExpireResult(`Đã hủy ${r?.cancelled ?? '?'} đơn PENDING quá hạn.`);
              } catch (e) {
                setExpireResult(`Lỗi: ${(e as Error).message}`);
              }
            }}
            className="shrink-0 rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-40"
          >
            {expirePending.isPending ? 'Đang chạy…' : 'Chạy ngay'}
          </button>
        </div>
        {expireResult && (
          <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
            {expireResult}
          </p>
        )}
      </section>

      {/* Reconcile */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <FileCheck2 className="h-4 w-4 text-sky-500" /> Đối soát payment ↔ order
            </h3>
            <p className="mt-1 max-w-xl text-sm text-slate-500">
              Soát lệch giữa bản ghi payment và trạng thái đơn (paid mà đơn chưa
              CONFIRMED, đơn hoàn tất mà payment treo…). Cron chạy 03:00 hằng ngày.
            </p>
          </div>
          <button
            disabled={reconcile.isPending}
            onClick={async () => {
              try {
                const r = await reconcile.mutateAsync();
                // Service returns { mismatched: number, details[] } (ops page
                // previously read a nonexistent `mismatches` array → always
                // fell through to the generic message).
                const count =
                  r && typeof r === 'object' && 'mismatched' in r
                    ? (r as { mismatched: number }).mismatched
                    : undefined;
                setReconcileResult(
                  count == null
                    ? 'Đã chạy xong — xem kết quả chi tiết trong logs API.'
                    : count === 0
                      ? 'Đối soát sạch — không có lệch.'
                      : `Phát hiện ${count} lệch — kiểm tra logs API để xử lý.`,
                );
              } catch (e) {
                setReconcileResult(`Lỗi: ${(e as Error).message}`);
              }
            }}
            className="shrink-0 rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-40"
          >
            {reconcile.isPending ? 'Đang chạy…' : 'Đối soát ngay'}
          </button>
        </div>
        {reconcileResult && (
          <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
            {reconcileResult}
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Upload className="h-4 w-4 text-emerald-600" /> Đối soát CSV merchant portal
            </h3>
            <p className="mt-1 max-w-xl text-sm text-slate-500">
              Upload file CSV export từ portal VNPay/MoMo — server so providerRef +
              amount với DB, trả về matched / mismatched / missingInDb.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <select
              value={reportProvider}
              onChange={(e) => setReportProvider(e.target.value as 'VNPAY' | 'MOMO')}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
              aria-label="Cổng thanh toán"
            >
              <option value="VNPAY">VNPay</option>
              <option value="MOMO">MoMo</option>
            </select>
            <label className="cursor-pointer rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
              {report.isPending ? 'Đang đối soát…' : 'Chọn CSV & đối soát'}
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                disabled={report.isPending}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (!file) return;
                  try {
                    const r = (await report.mutateAsync({ provider: reportProvider, file })) as {
                      rows?: number;
                      matched?: number;
                      mismatched?: { providerRef: string; dbAmount: number; reportAmount: number }[];
                      missingInDb?: { providerRef: string }[];
                    };
                    const mm = r.mismatched ?? [];
                    const missing = r.missingInDb ?? [];
                    setReportResult(
                      `Đã soát ${r.rows ?? '?'} dòng: ${r.matched ?? '?'} khớp, ${mm.length} lệch amount/status, ${missing.length} thiếu trong DB.` +
                        (mm.length
                          ? ` Lệch: ${mm.slice(0, 5).map((m) => `${m.providerRef} (DB ${m.dbAmount} vs file ${m.reportAmount})`).join('; ')}${mm.length > 5 ? `… +${mm.length - 5} dòng` : ''}`
                          : ''),
                    );
                  } catch (err) {
                    setReportResult(`Lỗi: ${(err as Error).message}`);
                  }
                }}
              />
            </label>
          </div>
        </div>
        {reportResult && (
          <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
            {reportResult}
          </p>
        )}
      </section>
    </div>
  );
}
