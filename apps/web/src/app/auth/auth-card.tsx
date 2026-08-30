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
    <div className="mx-auto flex max-w-md flex-col justify-center px-3 py-10">
      <div className="mb-6 flex flex-col items-center gap-1.5 text-center">
        <Link
          href="/"
          aria-label="HomeMart — Trang chủ"
          className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary-600 to-emerald-500 text-2xl font-black text-white shadow-lg shadow-emerald-600/30 transition-transform hover:scale-105"
        >
          H
        </Link>
        <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
      </div>

      <div className="rounded-3xl bg-white p-6 shadow-card ring-1 ring-slate-100/90 sm:p-8">
        {children}
      </div>

      {footer && <p className="mt-5 text-center text-sm font-medium text-slate-500">{footer}</p>}
    </div>
  );
}
