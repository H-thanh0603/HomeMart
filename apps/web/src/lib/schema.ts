/**
 * JSON-LD builders (schema.org) — machine-readable content cho search
 * engines và AI agents đọc catalog không cần scrape UI.
 *
 * Chuẩn hóa theo schema.org hiện hành (Google/Microsoft/Perplexity/ChatGPT
 * đều parse được) — KHÔNG phụ thuộc draft WebMCP.
 */

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://homemart.vn';

interface JsonLdImage {
  url: string;
  isPrimary: boolean;
}

interface JsonLdProductInput {
  slug: string;
  name: string;
  sku: string;
  shortDescription?: string | null;
  price: number; // VND integer
  compareAtPrice?: number | null;
  status: string;
  ratingAvg: number | string;
  reviewCount: number;
  brandName?: string | null;
  categoryName?: string | null;
  images?: JsonLdImage[];
  availableStock?: number;
}

export function availabilityFor(status: string, availableStock?: number): string {
  if (status !== 'PUBLISHED') return 'https://schema.org/OutOfStock';
  if (typeof availableStock === 'number' && availableStock <= 0) return 'https://schema.org/OutOfStock';
  return 'https://schema.org/InStock';
}

function priceValidUntil(): string {
  // Offer không có expiry — dùng 30 ngày (Google khuyến nghị ngày trong
  // tương lai để không bị coi là stale).
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
}

/** schema.org/Product — trang chi tiết sản phẩm. */
export function productJsonLd(p: JsonLdProductInput): Record<string, unknown> {
  const url = `${SITE_URL}/products/${p.slug}`;
  const image = p.images?.find((i) => i.isPrimary) ?? p.images?.[0];
  const availability = availabilityFor(p.status, p.availableStock);

  const graph: Record<string, unknown> = {
    '@type': 'Product',
    '@id': `${url}#product`,
    name: p.name,
    sku: p.sku,
    description: p.shortDescription ?? undefined,
    image: image ? [image.url] : undefined,
    category: p.categoryName ?? undefined,
    offers: {
      '@type': 'Offer',
      url,
      priceCurrency: 'VND',
      price: p.price,
      availability,
      priceValidUntil: priceValidUntil(),
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@type': 'Organization', name: 'HomeMart' },
    },
  };

  // Brand là node riêng (không phải string) theo pattern khuyến nghị
  if (p.brandName) graph.brand = { '@type': 'Brand', name: p.brandName };

  // AggregateRating: chỉ khi có review — 0 review mà vẫn ghi rating là
  // spam signal cho cả search engine lẫn agent
  const rating = Number(p.ratingAvg) || 0;
  if (p.reviewCount > 0 && rating > 0) {
    graph.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: rating.toFixed(1),
      reviewCount: p.reviewCount,
      bestRating: 5,
      worstRating: 1,
    };
  }

  return {
    '@context': 'https://schema.org',
    ...graph,
  };
}

interface BreadcrumbItem {
  name: string;
  href: string;
}

/** schema.org/BreadcrumbList — cho mọi trang có breadcrumb. */
export function breadcrumbJsonLd(items: BreadcrumbItem[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: `${SITE_URL}${item.href}`,
    })),
  };
}

/** schema.org/Organization — dùng cho layout root. */
export function organizationJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'HomeMart',
    url: SITE_URL,
    logo: `${SITE_URL}/og-image.svg`,
    description: 'HomeMart — thương hiệu điện máy & đồ gia dụng chính hãng.',
  };
}

/** schema.org/WebSite (+ SearchAction) — layout root, giúp agent tìm theo từ khóa. */
export function websiteJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'HomeMart',
    url: SITE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/products?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}
