'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Heart, MapPin, Package, User as UserIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

const NAV = [
  { href: '/account', label: 'Hồ sơ cá nhân', icon: UserIcon, exact: true },
  { href: '/account/orders', label: 'Đơn hàng của tôi', icon: Package },
  { href: '/account/addresses', label: 'Sổ địa chỉ nhận hàng', icon: MapPin },
  { href: '/account/wishlist', label: 'Sản phẩm yêu thích', icon: Heart },
];

export function AccountLayoutShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
      <nav aria-label="Menu tài khoản" className="rounded-3xl bg-white p-4 shadow-card ring-1 ring-slate-100/90 h-fit">
        <div className="mb-3 px-3 pt-1">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Trung tâm tài khoản</p>
        </div>
        <ul className="flex gap-1.5 overflow-x-auto lg:flex-col">
          {NAV.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <li key={href} className="shrink-0">
                <Link
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-3 whitespace-nowrap rounded-2xl px-3.5 py-2.5 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600',
                    active
                      ? 'bg-emerald-50 text-emerald-800 shadow-sm'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                  )}
                >
                  <Icon className={cn('h-4 w-4', active ? 'text-emerald-600' : 'text-slate-400')} />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
