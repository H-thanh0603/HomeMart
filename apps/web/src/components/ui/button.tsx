'use client';

import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'accent' | 'outline' | 'ghost' | 'danger' | 'subtle';
type Size = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-gradient-to-r from-primary-600 to-emerald-600 text-white shadow-sm hover:from-primary-700 hover:to-emerald-700 hover:shadow-md hover:shadow-emerald-600/20 focus-visible:ring-primary-500 active:scale-[0.98]',
  accent:
    'bg-gradient-to-r from-accent-500 to-amber-500 text-white shadow-sm hover:from-accent-600 hover:to-amber-600 hover:shadow-md hover:shadow-accent-500/25 focus-visible:ring-accent-500 active:scale-[0.98]',
  outline:
    'border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50/80 hover:border-slate-300 hover:text-slate-900 focus-visible:ring-primary-500 active:scale-[0.98]',
  ghost:
    'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 focus-visible:ring-primary-500 active:scale-[0.98]',
  subtle:
    'bg-primary-50 text-primary-700 hover:bg-primary-100/80 focus-visible:ring-primary-500 active:scale-[0.98]',
  danger:
    'bg-red-600 text-white shadow-sm hover:bg-red-700 hover:shadow-md hover:shadow-red-600/20 focus-visible:ring-red-600 active:scale-[0.98]',
};

const sizeClasses: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs font-medium gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm font-semibold gap-2 rounded-xl',
  lg: 'h-12 px-6 text-base font-semibold gap-2.5 rounded-xl',
  icon: 'h-10 w-10 p-0 rounded-xl',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span
          aria-hidden
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      {children}
    </button>
  ),
);
Button.displayName = 'Button';
