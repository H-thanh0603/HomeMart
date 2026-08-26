'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Heart, MapPin, Package, User as UserIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

const NAV = [
  { href: '/account', label: 'Hồ sơ', icon: UserIcon, exact: true },
  { href: '/account/orders', label: 'Đơn hàng của tôi', icon: Package },
  { href: '/account/addresses', label: 'Sổ địa chỉ', icon: MapPin },
  { href: '/account/wishlist', label: 'Yêu thích', icon: Heart },
];

export function AccountLayoutShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="grid gap-5 lg:grid-cols-[240px_1fr]">
      <nav aria-label="Menu tài khoản" className="rounded-xl bg-white p-3 shadow-card ring-1 ring-slate-100">
        <ul className="flex gap-1 overflow-x-auto lg:flex-col">
          {NAV.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <li key={href} className="shrink-0">
                <Link
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600',
                    active
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-slate-600 hover:bg-slate-50',
                  )}
                >
                  <Icon className="h-4 w-4" />
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
