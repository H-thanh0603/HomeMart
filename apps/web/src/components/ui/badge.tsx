'use client';

import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { ORDER_STATUS_LABELS } from '@/lib/utils';

type Tone = 'default' | 'primary' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

const tones: Record<Tone, string> = {
  default: 'bg-slate-100/90 text-slate-700 ring-1 ring-slate-200/60',
  primary: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20',
  accent: 'bg-accent-50 text-accent-700 ring-1 ring-accent-500/25',
  success: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500/20',
  warning: 'bg-amber-50 text-amber-800 ring-1 ring-amber-500/25',
  danger: 'bg-red-50 text-red-700 ring-1 ring-red-500/20',
  info: 'bg-sky-50 text-sky-700 ring-1 ring-sky-500/20',
};

const dotColors: Record<Tone, string> = {
  default: 'bg-slate-400',
  primary: 'bg-emerald-500',
  accent: 'bg-accent-500',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
  info: 'bg-sky-500',
};

export function Badge({
  className,
  tone = 'default',
  dot = false,
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone; dot?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-tight transition-colors',
        tones[tone],
        className,
      )}
      {...props}
    >
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', dotColors[tone])} />}
      {children}
    </span>
  );
}

export function OrderStatusBadge({ status }: { status: string }) {
  const toneMap: Record<string, Tone> = {
    PENDING: 'warning',
    CONFIRMED: 'info',
    PROCESSING: 'info',
    PACKING: 'info',
    SHIPPED: 'primary',
    DELIVERED: 'success',
    COMPLETED: 'success',
    CANCELLED: 'danger',
    RETURN_REQUESTED: 'warning',
    RETURNED: 'danger',
    REFUNDED: 'danger',
  };
  const tone = toneMap[status] ?? 'default';
  return (
    <Badge tone={tone} dot>
      {ORDER_STATUS_LABELS[status] ?? status}
    </Badge>
  );
}
