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
    sm: { price: 'text-sm font-bold', original: 'text-[11px]' },
    md: { price: 'text-base font-bold', original: 'text-xs' },
    lg: { price: 'text-2xl md:text-3xl font-extrabold', original: 'text-sm' },
  }[size];

  return (
    <div className={cn('flex flex-wrap items-baseline gap-x-2', className)}>
      <span className={cn('tracking-tight text-accent-600', sizes.price)} aria-label={`Giá ${formatCurrency(price)}`}>
        {formatCurrency(price)}
      </span>
      {hasDiscount && (
        <>
          <span className={cn('font-normal text-slate-400 line-through', sizes.original)}>
            {formatCurrency(compareAtPrice!)}
          </span>
          <span className="inline-flex items-center rounded-md bg-accent-500/10 px-1.5 py-0.5 text-[11px] font-bold text-accent-600">
            -{Math.round(((compareAtPrice! - price) / compareAtPrice!) * 100)}%
          </span>
        </>
      )}
    </div>
  );
}
