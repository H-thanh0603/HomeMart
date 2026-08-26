'use client';

import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { ORDER_STATUS_LABELS } from '@/lib/utils';

type Tone = 'default' | 'primary' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

const tones: Record<Tone, string> = {
  default: 'bg-slate-100 text-slate-700',
  primary: 'bg-primary-50 text-primary-700',
  accent: 'bg-accent-100 text-accent-700',
  success: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-red-100 text-red-700',
  info: 'bg-sky-100 text-sky-700',
};

export function Badge({ className, tone = 'default', ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        tones[tone],
        className,
      )}
      {...props}
    />
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
  return <Badge tone={toneMap[status] ?? 'default'}>{ORDER_STATUS_LABELS[status] ?? status}</Badge>;
}
