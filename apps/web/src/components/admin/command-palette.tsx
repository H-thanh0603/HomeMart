'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { filterCommands } from '@/lib/admin-helpers';

/**
 * Command palette cho admin power users (spec §28): ⌘K / Ctrl+K mở,
 * gõ để lọc, Enter để đi, Esc đóng. Không thêm dependency.
 */
export function AdminCommandPalette({
  items,
}: {
  items: { href: string; label: string; hint?: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  // Mirror open qua ref để handler ⌘K (deps []) không cần updater impure.
  const openRef = useRef(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        openRef.current = !openRef.current;
        if (openRef.current) {
          setQ('');
          setIndex(0);
        }
        setOpen(openRef.current);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 0);
    return () => clearTimeout(t);
  }, [open]);

  // Logic lọc nằm trong admin-helpers để có unit test.
  const filtered = useMemo(() => filterCommands(items, q), [items, q]);

  if (!open) return null;

  const close = () => {
    openRef.current = false;
    setOpen(false);
  };

  const go = (href: string) => {
    close();
    router.push(href);
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center px-4 pt-[15vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <button aria-label="Đóng" className="absolute inset-0 bg-slate-900/40" onClick={close} tabIndex={-1} />
      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center gap-2 border-b border-slate-100 px-4">
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => { setQ(e.target.value); setIndex(0); }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') close();
              else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setIndex((i) => Math.min(i + 1, Math.max(filtered.length - 1, 0)));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setIndex((i) => Math.max(i - 1, 0));
              } else if (e.key === 'Enter' && filtered[index]) {
                go(filtered[index].href);
              }
            }}
            placeholder="Gõ lệnh hoặc trang… (Esc để đóng)"
            className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
            aria-label="Tìm lệnh"
          />
        </div>
        <ul className="max-h-64 overflow-auto py-1.5" role="listbox">
          {filtered.length === 0 && (
            <li className="px-4 py-6 text-center text-sm text-slate-500">Không khớp lệnh nào.</li>
          )}
          {filtered.map((i, idx) => (
            <li key={i.href + i.label} role="option" aria-selected={idx === index}>
              <button
                onMouseEnter={() => setIndex(idx)}
                onClick={() => go(i.href)}
                className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm ${
                  idx === index ? 'bg-emerald-50 text-emerald-900' : 'text-slate-700'
                }`}
              >
                <span className="font-medium">{i.label}</span>
                {i.hint && <span className="text-xs text-slate-400">{i.hint}</span>}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
