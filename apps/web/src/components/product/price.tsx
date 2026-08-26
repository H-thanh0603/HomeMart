import { cn, formatCurrency } from '@/lib/utils';

interface PriceProps {
  price: number;
  compareAtPrice?: number | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Price({ price, compareAtPrice, size = 'md', className }: PriceProps) {
  const hasDiscount = Boolean(compareAtPrice && compareAtPrice > price);
  const sizes = {
    sm: { price: 'text-sm', original: 'text-xs' },
    md: { price: 'text-base', original: 'text-xs' },
    lg: { price: 'text-2xl', original: 'text-sm' },
  }[size];

  return (
    <div className={cn('flex flex-wrap items-baseline gap-x-2', className)}>
      <span className={cn('font-semibold text-accent-600', sizes.price)} aria-label={`Giá ${formatCurrency(price)}`}>
        {formatCurrency(price)}
      </span>
      {hasDiscount && (
        <>
          <span className={cn('text-slate-400 line-through', sizes.original)}>
            {formatCurrency(compareAtPrice!)}
          </span>
          <span className="rounded-full bg-accent-500 px-1.5 py-0.5 text-[11px] font-semibold leading-none text-white">
            -{Math.round(((compareAtPrice! - price) / compareAtPrice!) * 100)}%
          </span>
        </>
      )}
    </div>
  );
}
