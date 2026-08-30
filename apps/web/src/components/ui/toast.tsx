'use client';

import { CheckCircle2, Info, XCircle, X } from 'lucide-react';
import { useToastStore } from '@/stores/toast-store';

export function Toaster() {
  const { toasts, dismiss } = useToastStore();
  if (toasts.length === 0) return null;

  return (
    <div aria-live="polite" className="fixed bottom-5 right-5 z-[80] flex w-full max-w-sm flex-col gap-2.5">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={`flex items-start gap-3 rounded-2xl p-4 text-sm shadow-xl backdrop-blur-md transition-all duration-300 animate-slide-up ${
            t.type === 'success'
              ? 'border border-emerald-500/30 bg-emerald-950/90 text-emerald-50 shadow-emerald-950/30'
              : t.type === 'error'
                ? 'border border-red-500/30 bg-red-950/90 text-red-50 shadow-red-950/30'
                : 'border border-slate-700/50 bg-slate-900/90 text-slate-50 shadow-slate-950/30'
          }`}
        >
          {t.type === 'success' ? (
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
          ) : t.type === 'error' ? (
            <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
          ) : (
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-sky-400" />
          )}
          <span className="flex-1 font-medium leading-relaxed">{t.message}</span>
          <button
            aria-label="Đóng thông báo"
            onClick={() => dismiss(t.id)}
            className="rounded-lg p-1 text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
