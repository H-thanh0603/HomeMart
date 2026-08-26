'use client';

import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RatingStarsProps {
  value: number | string;
  count?: number;
  size?: number;
  showValue?: boolean;
  className?: string;
}

export function RatingStars({ value, count, size = 14, showValue = false, className }: RatingStarsProps) {
  const rating = typeof value === 'string' ? parseFloat(value) : value;

  return (
    <div className={cn('flex items-center gap-1', className)} aria-label={`Đánh giá ${rating.toFixed(1)} trên 5 sao`}>
      <div className="relative flex">
        <div className="flex gap-0.5 text-slate-200">
          {[1, 2, 3, 4, 5].map((i) => (
            <Star key={i} style={{ width: size, height: size }} fill="currentColor" strokeWidth={0} />
          ))}
        </div>
        <div
          className="absolute inset-0 flex gap-0.5 overflow-hidden text-amber-400"
          style={{ width: `${Math.min(100, (rating / 5) * 100)}%` }}
        >
          {[1, 2, 3, 4, 5].map((i) => (
            <Star key={i} style={{ width: size, height: size, minWidth: size }} fill="currentColor" strokeWidth={0} />
          ))}
        </div>
      </div>
      {showValue && <span className="text-xs font-medium text-slate-500">{rating > 0 ? rating.toFixed(1) : 'Mới'}</span>}
      {typeof count === 'number' && (
        <span className="text-xs text-slate-400">({count})</span>
      )}
    </div>
  );
}
