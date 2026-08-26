'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

/** Khung card chung cho các trang xác thực. */
export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col justify-center px-2 py-8">
      <div className="mb-5 flex flex-col items-center gap-1">
        <Link href="/" aria-label="HomeMart — Trang chủ" className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-700 text-xl font-black text-white">
          H
        </Link>
        <h1 className="mt-2 text-xl font-bold text-slate-900">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
      </div>

      <div className="rounded-xl bg-white p-5 shadow-card ring-1 ring-slate-100 sm:p-6">
        {children}
      </div>

      {footer && <p className="mt-4 text-center text-sm text-slate-500">{footer}</p>}
    </div>
  );
}
