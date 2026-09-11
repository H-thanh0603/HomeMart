/** Render JSON-LD script tag — server component, JSON.stringify an toàn (escape </script>). */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return (
    <script
      type="application/ld+json"
      // JSON-LD là static data từ server — KHÔNG phải user input nguy hiểm
      // (đã escape </script> ở trên để chống breakout khỏi thẻ script)
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
