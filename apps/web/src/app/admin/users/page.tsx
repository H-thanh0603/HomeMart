'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import { useAdminUserMutation, useAdminUsers } from '@/hooks/use-admin';
import { useAuthStore } from '@/stores/auth-store';
import { USER_ROLES, USER_STATUSES } from '@/lib/admin-types';
import { formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { DialogLite } from '@/components/ui/dialog-lite';
import { FilterChips } from '@/components/admin/filter-chips';
import { useSlashFocus } from '@/components/admin/use-slash-focus';
import { ErrorState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/stores/toast-store';
import { friendlyAdminError } from '@/lib/admin-helpers';

const ROLE_BADGE: Record<string, string> = {
  ADMIN: 'bg-purple-100 text-purple-700',
  MANAGER: 'bg-blue-100 text-blue-700',
  STAFF: 'bg-sky-100 text-sky-700',
  CUSTOMER: 'bg-slate-100 text-slate-600',
};

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  INACTIVE: 'bg-slate-100 text-slate-600',
  BANNED: 'bg-red-100 text-red-700',
};

const ROLE_RANK: Record<string, number> = {
  CUSTOMER: 0,
  STAFF: 1,
  MANAGER: 2,
  ADMIN: 3,
};

export default function AdminUsersPage() {
  const { user } = useAuthStore();
  const searchParams = useSearchParams();
  const router = useRouter();

  const isAdmin = user?.role === 'ADMIN';

  const q = searchParams.get('q') ?? '';
  const role = searchParams.get('role') ?? '';
  const status = searchParams.get('status') ?? '';
  const page = Number(searchParams.get('page') ?? '1') || 1;

  const [searchInput, setSearchInput] = useState(q);
  const searchRef = useRef<HTMLInputElement>(null);
  useSlashFocus(searchRef);
  const [confirming, setConfirming] = useState<{
    id: string;
    email: string;
    kind: 'role' | 'status';
    from: string;
    to: string;
  } | null>(null);

  const { data, isLoading, isError, error, refetch } = useAdminUsers({
    page,
    ...(q ? { q } : {}),
    ...(role ? { role } : {}),
    ...(status ? { status } : {}),
  });

  const { updateRole, updateStatus } = useAdminUserMutation();

  const totalPages = data?.meta?.totalPages ?? 1;
  const users = data?.data ?? [];

  const updateQuery = useMemo(
    () =>
      (patch: Record<string, string | null>) => {
        const next = new URLSearchParams(searchParams.toString());
        for (const [k, v] of Object.entries(patch)) {
          if (v == null || v === '') next.delete(k);
          else next.set(k, v);
        }
        router.replace(`/admin/users?${next.toString()}`);
      },
    [searchParams, router],
  );

  if (!isAdmin) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-8 text-center">
        <p className="text-sm font-medium text-amber-800">
          Trang quản lý người dùng chỉ dành cho ADMIN (endpoint có Roles(ADMIN) guard phía server).
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-bold text-slate-900">
          Người dùng{data?.meta?.total != null ? ` (${data.meta.total})` : ''}
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <form
            className="relative"
            onSubmit={(e) => {
              e.preventDefault();
              updateQuery({ q: searchInput, page: null });
            }}
          >
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              ref={searchRef}
              placeholder="Email, tên, SĐT…  ( / )"
              className="h-10 w-56 rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm shadow-sm outline-none focus:border-emerald-400"
            />
          </form>
          <select
            value={role}
            onChange={(e) => updateQuery({ role: e.target.value || null, page: null })}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm outline-none focus:border-emerald-400"
          >
            <option value="">Tất cả role</option>
            {USER_ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <select
            value={status}
            onChange={(e) => updateQuery({ status: e.target.value || null, page: null })}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm outline-none focus:border-emerald-400"
          >
            <option value="">Tất cả trạng thái</option>
            {USER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <FilterChips
        chips={[
          ...(q ? [{ key: 'q', label: `"${q}"`, onRemove: () => { setSearchInput(''); updateQuery({ q: null, page: null }); } }] : []),
          ...(role ? [{ key: 'role', label: `Role: ${role}`, onRemove: () => updateQuery({ role: null, page: null }) }] : []),
          ...(status ? [{ key: 'status', label: `Trạng thái: ${status}`, onRemove: () => updateQuery({ status: null, page: null }) }] : []),
        ]}
        onClearAll={() => { setSearchInput(''); updateQuery({ q: null, role: null, status: null, page: null }); }}
      />

      {isError && (
        <ErrorState
          message={`Không tải được danh sách: ${(error as Error).message}`}
          onRetry={() => refetch()}
        />
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Tên</th>
                <th className="px-4 py-3">SĐT</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Đăng nhập cuối</th>
                <th className="px-4 py-3">Ngày tạo</th>
                <th className="px-4 py-3">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={8} className="px-4 py-3.5">
                        <Skeleton className="h-6 w-full" />
                      </td>
                    </tr>
                  ))
                : users.map((u) => {
                    const isSelf = u.id === user?.id;
                    return (
                      <tr key={u.id} className="transition-colors hover:bg-slate-50/60">
                        <td className="px-4 py-3.5 font-medium text-slate-800">{u.email}</td>
                        <td className="px-4 py-3.5 text-slate-600">{u.fullName}</td>
                        <td className="px-4 py-3.5 text-slate-600">{u.phone ?? '—'}</td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ROLE_BADGE[u.role] ?? 'bg-slate-100 text-slate-600'}`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_BADGE[u.status] ?? 'bg-slate-100 text-slate-600'}`}
                          >
                            {u.status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-500">
                          {u.lastLoginAt ? formatDate(u.lastLoginAt) : '—'}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-500">
                          {formatDate(u.createdAt)}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <select
                              value={u.role}
                              disabled={isSelf || updateRole.isPending}
                              title={isSelf ? 'Không thể tự đổi role của chính mình' : 'Đổi role'}
                              onChange={(e) => {
                                const nextRole = e.target.value;
                                if (nextRole === u.role) return;
                                const isDemote =
                                  (ROLE_RANK[nextRole] ?? 0) < (ROLE_RANK[u.role] ?? 0);
                                if (isDemote) {
                                  setConfirming({ id: u.id, email: u.email, kind: 'role', from: u.role, to: nextRole });
                                  e.target.value = u.role;
                                  return;
                                }
                                updateRole.mutate(
                                  { id: u.id, role: nextRole },
                                  {
                                    onSuccess: () => toast.success('Đã cập nhật role'),
                                    onError: (err) => toast.error(friendlyAdminError(err)),
                                  },
                                );
                              }}
                              className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700 outline-none focus:border-emerald-400 disabled:opacity-40"
                            >
                              {USER_ROLES.map((r) => (
                                <option key={r} value={r}>
                                  {r}
                                </option>
                              ))}
                            </select>
                            <select
                              value={u.status}
                              disabled={isSelf || updateStatus.isPending}
                              title={isSelf ? 'Không thể tự đổi trạng thái của chính mình' : 'Đổi trạng thái'}
                              onChange={(e) => {
                                const nextStatus = e.target.value;
                                if (nextStatus === u.status) return;
                                if (nextStatus === 'BANNED') {
                                  setConfirming({ id: u.id, email: u.email, kind: 'status', from: u.status, to: nextStatus });
                                  e.target.value = u.status;
                                  return;
                                }
                                updateStatus.mutate(
                                  { id: u.id, status: nextStatus },
                                  {
                                    onSuccess: () => toast.success('Đã cập nhật trạng thái'),
                                    onError: (err) => toast.error(friendlyAdminError(err)),
                                  },
                                );
                              }}
                              className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700 outline-none focus:border-emerald-400 disabled:opacity-40"
                            >
                              {USER_STATUSES.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              {!isLoading && users.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <p className="text-sm text-slate-500">
                      {q || role || status
                        ? 'Không có người dùng nào khớp bộ lọc.'
                        : 'Chưa có người dùng nào.'}
                    </p>
                    {(q || role || status) && (
                      <button
                        onClick={() => updateQuery({ q: null, role: null, status: null, page: null })}
                        className="mt-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                      >
                        Xóa bộ lọc
                      </button>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination page={page} totalPages={totalPages} onChange={(p) => updateQuery({ page: String(p) })} />

      <DialogLite
        open={Boolean(confirming)}
        onClose={() => setConfirming(null)}
        title={confirming?.kind === 'role' ? 'Xác nhận hạ quyền' : 'Xác nhận khóa tài khoản'}
      >
        <p className="text-sm text-slate-700">
          {confirming?.kind === 'role' ? (
            <>Hạ role <strong>{confirming.email}</strong> từ <strong>{confirming.from}</strong> xuống <strong>{confirming.to}</strong>? Hành động này giới hạn quyền truy cập ngay lập tức.</>
          ) : (
            <>Khóa tài khoản <strong>{confirming?.email}</strong>? Người dùng sẽ không đăng nhập được nữa.</>
          )}
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirming(null)}>Hủy</Button>
          <Button
            variant="danger"
            loading={updateRole.isPending || updateStatus.isPending}
            onClick={() => {
              if (!confirming) return;
              if (confirming.kind === 'role') {
                updateRole.mutate(
                  { id: confirming.id, role: confirming.to },
                  {
                    onSuccess: () => { toast.success('Đã cập nhật role'); setConfirming(null); },
                    onError: (err) => toast.error(friendlyAdminError(err)),
                  },
                );
              } else {
                updateStatus.mutate(
                  { id: confirming.id, status: confirming.to },
                  {
                    onSuccess: () => { toast.success('Đã cập nhật trạng thái'); setConfirming(null); },
                    onError: (err) => toast.error(friendlyAdminError(err)),
                  },
                );
              }
            }}
          >
            Xác nhận
          </Button>
        </div>
      </DialogLite>
    </div>
  );
}
