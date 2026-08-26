'use client';

import { CheckCircle2, Info, XCircle, X } from 'lucide-react';
import { useToastStore } from '@/stores/toast-store';

export function Toaster() {
  const { toasts, dismiss } = useToastStore();
  if (toasts.length === 0) return null;

  return (
    <div aria-live="polite" className="fixed bottom-4 right-4 z-[70] flex w-full max-w-xs flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={`flex items-start gap-2 rounded-xl px-4 py-3 text-sm shadow-card-hover ${
            t.type === 'success'
              ? 'bg-emerald-600 text-white'
              : t.type === 'error'
                ? 'bg-red-600 text-white'
                : 'bg-slate-800 text-white'
          }`}
        >
          {t.type === 'success' ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          ) : t.type === 'error' ? (
            <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <span className="flex-1">{t.message}</span>
          <button
            aria-label="Đóng thông báo"
            onClick={() => dismiss(t.id)}
            className="rounded-md p-0.5 opacity-80 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
