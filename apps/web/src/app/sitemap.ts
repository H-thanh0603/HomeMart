import type { MetadataRoute } from 'next';

const THEME_SLUGS = ['nha-bep', 'dien-gia-dung', 'dung-cu-sua-chua', 've-sinh-nha-cua', 'noi-that-nho', 'nha-thong-minh'];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [staticWithCategories, products] = await Promise.all([staticRoutes(), productRoutes()]);
  return [...staticWithCategories, ...products];
}

/** Routes tĩnh + categories động (fallback static nếu API chưa chạy ở build time). */
async function staticRoutes(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://homemart.vn';
  const now = new Date();
  const routes: MetadataRoute.Sitemap = [
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
            ...routes,
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
  return routes;
}

/** Catalog công khai — deep links cho search engines và AI agents.
 *  API limit max 100/page nên phân trang tối đa SITEMAP_MAX_PAGES trang. */
const SITEMAP_MAX_PAGES = 5;
async function productRoutes(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://homemart.vn';
  const now = new Date();
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
  if (!apiBase.startsWith('http')) return [];
  const routes: MetadataRoute.Sitemap = [];
  try {
    for (let page = 1; page <= SITEMAP_MAX_PAGES; page++) {
      const res = await fetch(
        `${apiBase}/products?limit=100&page=${page}&sort=newest`,
        { next: { revalidate: 3600 } },
      );
      if (!res.ok) break;
      const json = (await res.json()) as { data?: { items?: { slug: string; updatedAt?: string }[] } };
      const items = json.data?.items ?? [];
      if (items.length === 0) break;
      routes.push(
        ...items.map((p) => ({
          url: `${base}/products/${p.slug}`,
          lastModified: p.updatedAt ? new Date(p.updatedAt) : now,
          changeFrequency: 'daily' as const,
          priority: 0.6,
        })),
      );
      if (items.length < 100) break; // hết dữ liệu
    }
  } catch {
    // API chưa chạy ở build time → sitemap chỉ có static routes (đã test)
  }
  return routes;
}
