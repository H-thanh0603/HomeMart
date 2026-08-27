import type { MetadataRoute } from 'next';

const THEME_SLUGS = ['nha-bep', 'dien-gia-dung', 'dung-cu-sua-chua', 've-sinh-nha-cua', 'noi-that-nho', 'nha-thong-minh'];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://homemart.vn';
  const now = new Date();
  return [
    { url: `${base}/`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/products`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    ...THEME_SLUGS.map((slug) => ({
      url: `${base}/danh-muc/${slug}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
    { url: `${base}/policies`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${base}/policies#return`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${base}/policies#warranty`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${base}/faq`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${base}/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
  ];
}
