import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://homemart.vn';

  // Khu vực riêng tư — chặn với MỌI crawler (kể cả AI agents)
  const privatePaths = ['/account/', '/checkout', '/checkout/', '/api/', '/auth/', '/orders/', '/admin'];

  return {
    rules: [
      // AI crawlers (GPTBot, ClaudeBot, PerplexityBot, Google-Extended...):
      // catalog công khai ĐƯỢC index — sản phẩm xuất hiện khi khách hỏi
      // ChatGPT/Perplexity 'máy xay sinh tố nào tốt?'. Vùng riêng tư chặn như
      // thường. Đây là quyết định kinh doanh: e-commerce cần traffic, chặn
      // toàn bộ = tự giấu khỏi kênh discovery đang lớn.
      { userAgent: ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-Web', 'anthropic-ai', 'PerplexityBot', 'Perplexity-User', 'Google-Extended'], allow: '/', disallow: privatePaths },
      // Search engines + crawlers chung
      { userAgent: '*', allow: '/', disallow: privatePaths },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
