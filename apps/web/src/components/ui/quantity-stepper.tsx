'use client';

import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuantityStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
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
    'flex items-center justify-center text-slate-600 transition-colors hover:bg-slate-100/90 active:bg-slate-200 disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500';
  
  const dimension = {
    sm: 'h-7 w-7 text-xs',
    md: 'h-9 w-9 text-sm',
    lg: 'h-11 w-11 text-base',
  }[size];

  return (
    <div className="inline-flex items-center overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm ring-1 ring-slate-100">
      <button
        type="button"
        aria-label="Giảm số lượng"
        className={cn(btn, dimension)}
        disabled={disabled || value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
      >
        <Minus className={size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'} />
      </button>
      <span
        aria-live="polite"
        className={cn(
          'flex items-center justify-center border-x border-slate-100 font-semibold tabular-nums text-slate-800',
          size === 'sm' ? 'h-7 w-8 text-xs' : size === 'lg' ? 'h-11 w-12 text-base' : 'h-9 w-10 text-sm',
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
        <Plus className={size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'} />
      </button>
    </div>
  );
}
