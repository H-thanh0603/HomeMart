/**
 * Unit test cho schema.ts JSON-LD builders (P4 — machine-readable content).
 * Pure functions — không cần DB hay API.
 */
import {
  availabilityFor,
  breadcrumbJsonLd,
  organizationJsonLd,
  productJsonLd,
  websiteJsonLd,
} from './schema';

describe('JSON-LD builders (machine-readable content)', () => {
  describe('availabilityFor', () => {
    it('PUBLISHED + còn hàng → InStock', () => {
      expect(availabilityFor('PUBLISHED', 5)).toBe('https://schema.org/InStock');
    });
    it('PUBLISHED + hết hàng → OutOfStock', () => {
      expect(availabilityFor('PUBLISHED', 0)).toBe('https://schema.org/OutOfStock');
    });
    it('không biết tồn kho (undefined) → InStock (kho mặc định có hàng)', () => {
      expect(availabilityFor('PUBLISHED', undefined)).toBe('https://schema.org/InStock');
    });
    it('DRAFT → OutOfStock (chưa bán)', () => {
      expect(availabilityFor('DRAFT', 10)).toBe('https://schema.org/OutOfStock');
    });
  });

  describe('productJsonLd', () => {
    it('đủ trường chính: Offer VND integer, sku, breadcrumb-able url', () => {
      const ld = productJsonLd({
        slug: 'may-xay-sinh-to', name: 'Máy Xay Sinh Tố', sku: 'MX-001',
        shortDescription: 'Máy xay sinh tố 500W', price: 499000, status: 'PUBLISHED',
        ratingAvg: 4.5, reviewCount: 12, brandName: 'Panasonic', categoryName: 'Nhà bếp',
      });
      expect(ld['@context']).toBe('https://schema.org');
      expect(ld['@type']).toBe('Product');
      const offers = ld.offers as Record<string, unknown>;
      expect(offers.price).toBe(499000); // VND integer — không phải chuỗi "499,000đ"
      expect(offers.priceCurrency).toBe('VND');
      expect(offers.availability).toBe('https://schema.org/InStock');
      expect((offers.seller as Record<string, unknown>).name).toBe('HomeMart');
      expect((ld.brand as Record<string, unknown>).name).toBe('Panasonic');
    });

    it('CÓ review → AggregateRating với ratingValue + reviewCount', () => {
      const ld = productJsonLd({
        slug: 's', name: 'n', sku: 'k', price: 1, status: 'PUBLISHED',
        ratingAvg: '4.2', reviewCount: 7,
      });
      const ar = ld.aggregateRating as Record<string, string>;
      expect(ar.ratingValue).toBe('4.2');
      expect(ar.reviewCount).toBe(7);
    });

    it('KHÔNG review → KHÔNG có aggregateRating (tránh spam signal)', () => {
      const ld = productJsonLd({
        slug: 's', name: 'n', sku: 'k', price: 1, status: 'PUBLISHED',
        ratingAvg: 0, reviewCount: 0,
      });
      expect(ld.aggregateRating).toBeUndefined();
    });

    it('hết hàng → OutOfStock trong Offer', () => {
      const ld = productJsonLd({
        slug: 's', name: 'n', sku: 'k', price: 1, status: 'PUBLISHED',
        ratingAvg: 0, reviewCount: 0, availableStock: 0,
      });
      expect((ld.offers as Record<string, unknown>).availability).toBe('https://schema.org/OutOfStock');
    });

    it('image primary được chọn (không phải image đầu tiên)', () => {
      const ld = productJsonLd({
        slug: 's', name: 'n', sku: 'k', price: 1, status: 'PUBLISHED',
        ratingAvg: 0, reviewCount: 0,
        images: [
          { url: '/img/secondary.jpg', isPrimary: false },
          { url: '/img/main.jpg', isPrimary: true },
        ],
      });
      expect(ld.image).toEqual(['/img/main.jpg']);
    });

    it('priceValidUntil là ngày tương lai ≤ 31 ngày (không stale)', () => {
      const ld = productJsonLd({
        slug: 's', name: 'n', sku: 'k', price: 1, status: 'PUBLISHED',
        ratingAvg: 0, reviewCount: 0,
      });
      const validUntil = (ld.offers as Record<string, string>).priceValidUntil;
      const days = (new Date(validUntil).getTime() - Date.now()) / 86400000;
      expect(days).toBeGreaterThan(28);
      expect(days).toBeLessThan(32);
    });
  });

  describe('breadcrumbJsonLd', () => {
    it('vị trí 1-based + full URL', () => {
      const ld = breadcrumbJsonLd([
        { name: 'Trang chủ', href: '/' },
        { name: 'Sản phẩm', href: '/products' },
      ]);
      const items = ld.itemListElement as Array<Record<string, unknown>>;
      expect(items[0].position).toBe(1);
      expect(items[1].position).toBe(2);
      expect(items[1].item).toContain('/products');
    });
  });

  describe('organizationJsonLd / websiteJsonLd', () => {
    it('Organization có tên + url + logo', () => {
      const ld = organizationJsonLd();
      expect(ld['@type']).toBe('Organization');
      expect(ld.name).toBe('HomeMart');
      expect(String(ld.url)).toMatch(/^https?:\/\//);
      expect(String(ld.logo)).toMatch(/^https?:\/\//);
    });

    it('WebSite có SearchAction với urlTemplate chứa {search_term_string}', () => {
      const ld = websiteJsonLd();
      const action = ld.potentialAction as Record<string, Record<string, string>>;
      expect(ld['@type']).toBe('WebSite');
      expect(action.target.urlTemplate).toContain('{search_term_string}');
    });
  });
});
