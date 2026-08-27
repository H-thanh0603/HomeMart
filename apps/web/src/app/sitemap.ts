import type { MetadataRoute } from 'next';

const THEME_SLUGS = ['nha-bep', 'dien-gia-dung', 'dung-cu-sua-chua', 've-sinh-nha-cua', 'noi-that-nho', 'nha-thong-minh'];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://homemart.vn';
  const now = new Date();
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/products`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    ...THEME_SLUGS.map((slug) => ({
      url: `${base}/danh-muc/${slug}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
    { url: `${base}/policies`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${base}/faq`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${base}/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
  ];

  // Thử fetch categories động — fallback static nếu API chưa chạy (build time)
  try {
    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
    // NEXT_PUBLIC_API_URL có thể là /api/v1 (relative) — chỉ fetch khi là absolute
    if (apiBase.startsWith('http')) {
      const res = await fetch(`${apiBase}/categories?limit=100`, { next: { revalidate: 3600 } });
      if (res.ok) {
        const json = (await res.json()) as { data?: { slug: string; updatedAt?: string }[] };
        const cats = json.data ?? [];
        if (cats.length) {
          return [
            ...staticRoutes,
            ...cats
              .filter((c) => !THEME_SLUGS.includes(c.slug))
              .map((c) => ({
                url: `${base}/danh-muc/${c.slug}`,
                lastModified: c.updatedAt ? new Date(c.updatedAt) : now,
                changeFrequency: 'weekly' as const,
                priority: 0.5,
              })),
          ];
        }
      }
    }
  } catch { /* fallback static */ }
  return staticRoutes;
}
