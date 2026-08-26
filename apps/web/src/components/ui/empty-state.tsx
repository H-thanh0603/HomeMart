'use client';

import { useRouter } from 'next/navigation';
import { Button } from './button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  href?: string;
}

export function EmptyState({ icon, title, description, actionLabel, onAction, href }: EmptyStateProps) {
  const router = useRouter();
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 bg-white/60 px-6 py-12 text-center">
      {icon && <div className="text-slate-300">{icon}</div>}
      <p className="text-base font-medium text-slate-700">{title}</p>
      {description && <p className="max-w-sm text-sm text-slate-400">{description}</p>}
      {(onAction || href) && actionLabel && (
        <Button
          variant="primary"
          className="mt-3"
          tabIndex={0}
          onClick={() => (href ? router.push(href) : onAction?.())}
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ message = 'Không thể tải dữ liệu. Vui lòng thử lại.', onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-red-100 bg-red-50/50 px-6 py-12 text-center">
      <p className="text-sm font-medium text-red-700">{message}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          Thử lại
        </Button>
      )}
    </div>
  );
}
