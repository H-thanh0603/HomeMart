'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Tags,
  Ticket,
  Warehouse,
  Truck,
  Star,
  BarChart3,
  ScrollText,
  Users,
  Wrench,
  ArrowLeft,
  ShieldAlert,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { ADMIN_ROLES } from '@/hooks/use-admin';
import { AdminCommandPalette } from '@/components/admin/command-palette';

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

  const isManager = user.role === 'ADMIN' || user.role === 'MANAGER';

  // Spec §2: nhóm nav theo chức năng thay vì list phẳng ~12 mục.
  const sections: { title: string | null; items: { href: string; label: string; icon: typeof LayoutDashboard }[] }[] = [
    { title: null, items: [{ href: '/admin', label: 'Dashboard', icon: LayoutDashboard }] },
    {
      title: 'Bán hàng',
      items: [
        { href: '/admin/orders', label: 'Đơn hàng', icon: Package },
        { href: '/admin/products', label: 'Sản phẩm', icon: ShoppingBag },
        { href: '/admin/catalog', label: 'Danh mục', icon: Tags },
        { href: '/admin/vouchers', label: 'Voucher', icon: Ticket },
        { href: '/admin/inventory', label: 'Tồn kho', icon: Warehouse },
        { href: '/admin/shipping', label: 'Vận chuyển', icon: Truck },
        { href: '/admin/reviews', label: 'Đánh giá', icon: Star },
      ],
    },
    {
      title: 'Quản trị',
      items: [
        { href: '/admin/reports', label: 'Báo cáo', icon: BarChart3 },
        ...(isManager ? [{ href: '/admin/ops', label: 'Vận hành', icon: Wrench }] : []),
        ...(user.role === 'ADMIN'
          ? [
              { href: '/admin/audit-logs', label: 'Audit logs', icon: ScrollText },
              { href: '/admin/users', label: 'Users', icon: Users },
            ]
          : []),
      ],
    },
  ];
  const nav = sections.flatMap((s) => s.items);

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
        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500 shadow-sm md:flex">
            Nhấn <kbd className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-bold text-slate-700">⌘K</kbd> để tìm lệnh
          </span>
          <Link
            href="/"
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 shadow-sm hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" /> Về cửa hàng
          </Link>
        </div>
      </div>

      <nav aria-label="Breadcrumb" className="mb-4 text-xs text-slate-500">
        <ol className="flex flex-wrap items-center gap-1.5">
          {(() => {
            const current =
              nav.find(
                (n) =>
                  pathname === n.href ||
                  (n.href !== '/admin' && pathname.startsWith(`${n.href}/`)),
              ) ?? nav[0];
            const isDetail = pathname !== current.href;
            return (
              <>
                <li>
                  <Link href="/admin" className="font-medium hover:text-slate-700 hover:underline">
                    Dashboard
                  </Link>
                </li>
                {current.href !== '/admin' && (
                  <>
                    <li aria-hidden>/</li>
                    <li>
                      {isDetail ? (
                        <Link href={current.href} className="font-medium hover:text-slate-700 hover:underline">
                          {current.label}
                        </Link>
                      ) : (
                        <span aria-current="page" className="font-semibold text-slate-800">
                          {current.label}
                        </span>
                      )}
                    </li>
                  </>
                )}
                {isDetail && (
                  <>
                    <li aria-hidden>/</li>
                    <li aria-current="page" className="font-semibold text-slate-800">
                      Chi tiết
                    </li>
                  </>
                )}
              </>
            );
          })()}
        </ol>
      </nav>
      <div className="flex flex-col gap-6 lg:flex-row">
        <nav aria-label="Admin" className="flex shrink-0 gap-4 overflow-x-auto lg:w-48 lg:flex-col lg:gap-5 lg:overflow-visible">
          {sections.map((s) => (
            <div key={s.title ?? 'main'} className="flex shrink-0 gap-2 lg:flex-col">
              {s.title && (
                <p className="hidden px-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 lg:block">
                  {s.title}
                </p>
              )}
              <div className="flex gap-2 lg:flex-col">
                {s.items.map(({ href, label, icon: Icon }) => {
                  const active =
                    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      aria-current={active ? 'page' : undefined}
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
              </div>
            </div>
          ))}
        </nav>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
      <AdminCommandPalette
        items={[
          ...nav.map((n) => ({ href: n.href, label: `Mở ${n.label}`, hint: n.href })),
          { href: '/admin/products', label: 'Tạo sản phẩm mới', hint: 'nhanh' },
          { href: '/admin/orders?status=PENDING', label: 'Đơn PENDING cần xử lý', hint: 'actionable' },
          { href: '/admin/reviews?status=PENDING', label: 'Đánh giá chờ duyệt', hint: 'actionable' },
          { href: '/admin/inventory', label: 'Tồn kho sắp hết', hint: 'actionable' },
        ]}
      />
    </div>
  );
}
