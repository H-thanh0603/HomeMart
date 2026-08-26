import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://homemart.vn';
  const now = new Date();
  return [
    { url: `${base}/`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/products`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/danh-muc`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${base}/policies`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${base}/policies#return`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${base}/policies#warranty`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
  ];
}
