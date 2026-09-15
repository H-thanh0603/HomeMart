'use client';

/**
 * Last-resort boundary: fires when the root layout itself throws.
 * Must render its own <html>/<body> because the root layout is unavailable.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
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
        }}
      >
        <div style={{ textAlign: 'center', padding: 24 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>HomeMart tạm thời gặp sự cố</h1>
          <p style={{ fontSize: 14, color: '#64748b', marginBottom: 16 }}>
            Vui lòng thử lại. Nếu lỗi tiếp diễn, liên hệ hotline hỗ trợ.
          </p>
          <button
            onClick={reset}
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
