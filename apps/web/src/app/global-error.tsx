'use client';

/**
 * Last-resort boundary: fires when the root layout itself throws.
 * Must render its own <html>/<body> because the root layout is unavailable.
 *
 * NOTE: this is a minimal static shell. It has NO React hooks — any hook
 * call (useState/useEffect/etc.) crashes the static prerender pass of
 * /_global-error in Next.js 16 with "Cannot read properties of null
 * (reading 'useContext')".
 *
 * Error details are never leaked to users; correlation happens via pino
 * server logs using the framework digest.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Suppress unused-parameter warnings — these props are wired by Next.js only
  // in the client-side boundary, not during the static build pass.
  void error;
  void reset;

  return (
    <html lang="vi">
      <body
        style={{
          display: 'flex',
          minHeight: '100vh',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif',
          background: '#f8fafc',
          color: '#1e293b',
          margin: 0,
        }}
      >
        <div style={{ textAlign: 'center', padding: 24 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
            HomeMart tạm thời gặp sự cố
          </h1>
          <p style={{ fontSize: 14, color: '#64748b', marginBottom: 16 }}>
            Vui lòng thử lại. Nếu lỗi tiếp diễn, liên hệ hotline hỗ trợ.
          </p>
          <button
            type="button"
            style={{
              background: '#059669',
              color: '#fff',
              border: 'none',
              borderRadius: 12,
              padding: '10px 24px',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Thử lại
          </button>
        </div>
      </body>
    </html>
  );
}
