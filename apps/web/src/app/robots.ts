import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://homemart.vn';
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/account/', '/checkout', '/checkout/', '/api/', '/auth/', '/orders/'] },
      { userAgent: 'GPTBot', disallow: ['/'] },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
