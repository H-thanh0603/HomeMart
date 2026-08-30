'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  const arr: number[] = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, start + 4);
  for (let i = start; i <= end; i++) arr.push(i);
  const pages = arr;

  const navBtn =
    'flex h-10 items-center justify-center gap-1 rounded-xl px-3.5 text-sm font-semibold transition-all duration-150 disabled:pointer-events-none disabled:opacity-40';

  return (
    <nav aria-label="Phân trang" className="mt-8 flex flex-wrap items-center justify-center gap-2">
      <button
        className={cn(
          navBtn,
          'border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 hover:border-slate-300',
        )}
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        aria-label="Trang trước"
      >
        <ChevronLeft className="h-4 w-4" /> Trước
      </button>
      {pages[0] > 1 && <span className="px-1.5 font-medium text-slate-400">…</span>}
      {pages.map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          aria-current={p === page ? 'page' : undefined}
          className={cn(
            navBtn,
            'min-w-[40px]',
            p === page
              ? 'bg-gradient-to-r from-primary-600 to-emerald-600 text-white shadow-md shadow-emerald-600/25'
              : 'border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 hover:border-slate-300',
          )}
        >
          {p}
        </button>
      ))}
      {pages[pages.length - 1] < totalPages && <span className="px-1.5 font-medium text-slate-400">…</span>}
      <button
        className={cn(
          navBtn,
          'border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 hover:border-slate-300',
        )}
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        aria-label="Trang sau"
      >
        Sau <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  );
}
