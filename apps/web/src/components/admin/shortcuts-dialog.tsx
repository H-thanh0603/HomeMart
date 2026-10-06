'use client';

import { useEffect, useState } from 'react';
import { DialogLite } from '@/components/ui/dialog-lite';

/**
 * Học Twenty keyboard-shortcut-menu: dialog liệt kê phím tắt, mở bằng `?`
 * (Shift+/). Không thêm dependency.
 */
export const ADMIN_SHORTCUTS: { keys: string; action: string }[] = [
  { keys: '⌘/Ctrl K', action: 'Mở command palette (đi tới trang / lệnh nhanh)' },
  { keys: '/', action: 'Focus ô tìm kiếm của trang đang mở' },
  { keys: '?', action: 'Mở bảng phím tắt này' },
  { keys: 'Esc', action: 'Đóng hộp thoại đang mở' },
  { keys: 'Tab / Shift+Tab', action: 'Di chuyển trong hộp thoại (focus trap)' },
];

export function AdminShortcutsDialog() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '?' || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      const typing =
        t &&
        (t.tagName === 'INPUT' ||
          t.tagName === 'TEXTAREA' ||
          t.tagName === 'SELECT' ||
          t.isContentEditable);
      if (typing) return;
      e.preventDefault();
      setOpen((o) => !o);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Xem phím tắt (phím ?)"
        title="Phím tắt (?)"
        className="flex items-center justify-center rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-xs font-bold text-slate-500 shadow-sm hover:bg-slate-50 hover:text-slate-700"
      >
        ?
      </button>
      <DialogLite open={open} onClose={() => setOpen(false)} title="Phím tắt admin">
        <ul className="space-y-2.5">
          {ADMIN_SHORTCUTS.map((s) => (
            <li key={s.keys} className="flex items-center justify-between gap-4 text-sm">
              <span className="text-slate-600">{s.action}</span>
              <kbd className="shrink-0 rounded-lg bg-slate-100 px-2 py-1 font-mono text-xs font-bold text-slate-700">
                {s.keys}
              </kbd>
            </li>
          ))}
        </ul>
      </DialogLite>
    </>
  );
}
