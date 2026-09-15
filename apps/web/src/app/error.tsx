'use client';

import { useEffect } from 'react';

/**
 * Route-level error boundary (Next App Router convention): catches render /
 * data errors inside the layout and offers a retry instead of a white page.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface for client diagnostics; production logging goes through the
    // digest in server logs (pino) — never render the raw message to users.
    console.error('[app-error]', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-white/80 px-6 py-20 text-center shadow-sm">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-3xl text-amber-600">
        ⚠️
      </div>
      <h2 className="text-lg font-bold text-slate-800">Có lỗi xảy ra</h2>
      <p className="max-w-sm text-sm text-slate-500">
        Chúng tôi không tải được nội dung này. Vui lòng thử lại sau ít phút.
      </p>
      <button
        onClick={reset}
        className="mt-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
      >
        Thử lại
      </button>
    </div>
  );
}
