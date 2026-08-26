'use client';

import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuantityStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  size?: 'sm' | 'md';
  disabled?: boolean;
}

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 999,
  size = 'md',
  disabled,
}: QuantityStepperProps) {
  const btn =
    'flex items-center justify-center text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-600';
  const dimension = size === 'sm' ? 'h-7 w-7 text-xs' : 'h-9 w-9';

  return (
    <div className="inline-flex items-center overflow-hidden rounded-xl border border-slate-300 bg-white">
      <button
        type="button"
        aria-label="Giảm số lượng"
        className={cn(btn, dimension)}
        disabled={disabled || value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
      >
        <Minus className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />
      </button>
      <span
        aria-live="polite"
        className={cn(
          'flex items-center justify-center border-x border-slate-300 font-medium tabular-nums',
          size === 'sm' ? 'h-7 w-8 text-xs' : 'h-9 w-10 text-sm',
        )}
      >
        {value}
      </span>
      <button
        type="button"
        aria-label="Tăng số lượng"
        className={cn(btn, dimension)}
        disabled={disabled || value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
      >
        <Plus className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />
      </button>
    </div>
  );
}
