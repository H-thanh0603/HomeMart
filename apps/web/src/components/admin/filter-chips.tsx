'use client';

import { X } from 'lucide-react';

/**
 * Chip hiển thị filter đang áp dụng (spec §7: người dùng phải nhìn thấy
 * filter nào đang bật + xóa từng cái / xóa hết).
 */
export function FilterChips({
  chips,
  onClearAll,
}: {
  chips: { key: string; label: string; onRemove: () => void }[];
  onClearAll: () => void;
}) {
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Bộ lọc đang áp dụng">
      {chips.map((c) => (
        <span
          key={c.key}
          className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 py-1 pl-3 pr-1.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-600/20"
        >
          {c.label}
          <button
            onClick={c.onRemove}
            aria-label={`Xóa bộ lọc ${c.label}`}
            className="rounded-full p-0.5 hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </span>
      ))}
      <button
        onClick={onClearAll}
        className="text-xs font-semibold text-slate-500 underline hover:text-slate-700"
      >
        Xóa hết
      </button>
    </div>
  );
}
