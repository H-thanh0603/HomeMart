'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useAuditLogs } from '@/hooks/use-admin';
import { useAuthStore } from '@/stores/auth-store';
import { formatDate } from '@/lib/utils';
import { EmptyState, ErrorState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { Skeleton } from '@/components/ui/skeleton';

function shortId(id?: string | null) {
  if (!id) return '—';
  return id.length > 8 ? `${id.slice(0, 8)}…` : id;
}

export default function AdminAuditLogsPage() {
  const { user } = useAuthStore();
  const searchParams = useSearchParams();
  const router = useRouter();

  const isAdmin = user?.role === 'ADMIN';

  const page = Number(searchParams.get('page') ?? '1') || 1;

  const { data, isLoading, isError, error, refetch } = useAuditLogs({ page });

  const totalPages = data?.meta?.totalPages ?? 1;
  const logs = data?.data ?? [];

  if (!isAdmin) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-8 text-center">
        <p className="text-sm font-medium text-amber-800">
          Trang nhật ký thao tác chỉ dành cho ADMIN (endpoint có Roles(ADMIN) guard phía server).
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <h2 className="text-base font-bold text-slate-900">
        Nhật ký thao tác{data?.meta?.total != null ? ` (${data.meta.total})` : ''}
      </h2>

      {isError && (
        <ErrorState
          message={`Không tải được danh sách: ${(error as Error).message}`}
          onRetry={() => refetch()}
        />
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Thời gian</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Entity</th>
                <th className="px-4 py-3">Entity ID</th>
                <th className="px-4 py-3">Actor ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={5} className="px-4 py-3.5">
                        <Skeleton className="h-6 w-full" />
                      </td>
                    </tr>
                  ))
                : logs.map((l) => (
                    <tr key={l.id} className="transition-colors hover:bg-slate-50/60">
                      <td className="whitespace-nowrap px-4 py-3.5 text-xs text-slate-500">
                        {formatDate(l.createdAt)}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-xs font-semibold text-slate-800">
                        {l.action}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-600">{l.entity}</td>
                      <td
                        className="cursor-default px-4 py-3.5 font-mono text-xs text-slate-600"
                        title={l.entityId ?? ''}
                      >
                        {shortId(l.entityId)}
                      </td>
                      <td
                        className="cursor-default px-4 py-3.5 font-mono text-xs text-slate-600"
                        title={l.actorId ?? ''}
                      >
                        {shortId(l.actorId)}
                      </td>
                    </tr>
                  ))}
              {!isLoading && logs.length === 0 && !isError && (
                <tr>
                  <td colSpan={5} className="px-4 py-8">
                    <EmptyState
                      title="Chưa có bản ghi audit log nào"
                      description="Các thao tác quan trọng của admin sẽ hiện ở đây."
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination
        page={page}
        totalPages={totalPages}
        onChange={(p) => {
          const next = new URLSearchParams(searchParams.toString());
          next.set('page', String(p));
          router.replace(`/admin/audit-logs?${next.toString()}`);
        }}
      />
    </div>
  );
}
