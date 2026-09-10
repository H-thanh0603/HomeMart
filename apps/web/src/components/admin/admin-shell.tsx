'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  Warehouse,
  Wrench,
  ArrowLeft,
  ShieldAlert,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { ADMIN_ROLES } from '@/hooks/use-admin';

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, hydrated } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  // Client-side role gate — server vẫn enforce qua Roles() guard trên mọi API.
  // Đây chỉ là UX (khỏi render app cho người không có quyền), không phải security.
  useEffect(() => {
    if (hydrated && (!user || !ADMIN_ROLES.includes(user.role))) {
      router.replace('/auth/login?redirect=/admin');
    }
  }, [hydrated, user, router]);

  if (!hydrated) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-slate-400">
        Đang tải…
      </div>
    );
  }

  if (!user || !ADMIN_ROLES.includes(user.role)) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 text-center">
        <ShieldAlert className="h-12 w-12 text-amber-500" />
        <h1 className="text-xl font-bold text-slate-900">Không có quyền truy cập</h1>
        <p className="text-sm text-slate-500">
          Khu vực quản trị chỉ dành cho STAFF / MANAGER / ADMIN.
        </p>
        <Link
          href="/auth/login?redirect=/admin"
          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Đăng nhập
        </Link>
      </div>
    );
  }

  const nav = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/orders', label: 'Đơn hàng', icon: Package },
    { href: '/admin/inventory', label: 'Tồn kho', icon: Warehouse },
    { href: '/admin/ops', label: 'Vận hành', icon: Wrench },
  ];

  const isManager = user.role === 'ADMIN' || user.role === 'MANAGER';

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-sm font-bold text-white">
            HM
          </span>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900">
              HomeMart Admin
            </h1>
            <p className="text-xs text-slate-500">
              {user.fullName} · <span className="font-semibold">{user.role}</span>
              {!isManager && ' (không duyệt hoàn tiền)'}
            </p>
          </div>
        </div>
        <Link
          href="/"
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 shadow-sm hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" /> Về cửa hàng
        </Link>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        <nav className="flex shrink-0 gap-2 overflow-x-auto lg:w-48 lg:flex-col">
          {nav.map(({ href, label, icon: Icon }) => {
            const active =
              href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2.5 whitespace-nowrap rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors ${
                  active
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon className="h-[18px] w-[18px]" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
