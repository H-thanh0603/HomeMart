/**
 * Unit test cho admin-helpers — logic thuần tách từ UI admin
 * (dashboard attentions, whitelist sort, lọc command palette).
 */
import { buildAttentions, filterCommands, normalizeProductSort } from './admin-helpers';

describe('normalizeProductSort', () => {
  it('giữ sort hợp lệ backend IsIn chấp nhận', () => {
    expect(normalizeProductSort('best_selling')).toBe('best_selling');
    expect(normalizeProductSort('price_asc')).toBe('price_asc');
    expect(normalizeProductSort('price_desc')).toBe('price_desc');
    expect(normalizeProductSort('rating')).toBe('rating');
  });
  it('sort lạ/null → rỗng (tránh backend 400)', () => {
    expect(normalizeProductSort('newest')).toBe('');
    expect(normalizeProductSort('DROP TABLE')).toBe('');
    expect(normalizeProductSort('')).toBe('');
    expect(normalizeProductSort(null)).toBe('');
    expect(normalizeProductSort(undefined)).toBe('');
  });
});

describe('filterCommands', () => {
  const items = [
    { href: '/admin', label: 'Mở Dashboard', hint: '/admin' },
    { href: '/admin/orders', label: 'Mở Đơn hàng', hint: '/admin/orders' },
    { href: '/admin/orders?status=PENDING', label: 'Đơn PENDING cần xử lý', hint: 'actionable' },
  ];
  it('rỗng → trả tối đa 10 item đầu', () => {
    expect(filterCommands(items, '')).toHaveLength(3);
    expect(filterCommands(items, '   ')).toHaveLength(3);
  });
  it('khớp label không dấu hoa thường', () => {
    const r = filterCommands(items, 'pending');
    expect(r).toHaveLength(1);
    expect(r[0].href).toContain('PENDING');
  });
  it('khớp href + hint', () => {
    expect(filterCommands(items, '/admin/orders')).toHaveLength(2);
    expect(filterCommands(items, 'actionable')).toHaveLength(1);
  });
  it('không khớp → rỗng', () => {
    expect(filterCommands(items, 'zzz-no-match')).toHaveLength(0);
  });
  it('cắt ở 10 item', () => {
    const many = Array.from({ length: 25 }, (_, i) => ({ href: `/a${i}`, label: `Item ${i}` }));
    expect(filterCommands(many, '')).toHaveLength(10);
  });
});

describe('buildAttentions', () => {
  it('không stats → rỗng', () => {
    expect(buildAttentions(null)).toEqual([]);
    expect(buildAttentions(undefined)).toEqual([]);
  });
  it('0 pending + 0 low + breakdown sạch → rỗng', () => {
    expect(
      buildAttentions({ pendingOrders: 0, lowStockCount: 0, statusBreakdown: [] }),
    ).toEqual([]);
  });
  it('pending + low + RETURN_REQUESTED → 3 mục đúng href', () => {
    const r = buildAttentions({
      pendingOrders: 8,
      lowStockCount: 23,
      statusBreakdown: [
        { status: 'RETURN_REQUESTED', count: 2 },
        { status: 'DELIVERED', count: 100 },
      ],
    });
    expect(r).toHaveLength(3);
    expect(r[0]).toMatchObject({ key: 'pending', href: '/admin/orders?status=PENDING' });
    expect(r[1]).toMatchObject({ key: 'low', href: '/admin/inventory' });
    expect(r[2]).toMatchObject({ key: 'RETURN_REQUESTED', href: '/admin/orders?status=RETURN_REQUESTED' });
  });
  it('count 0 → bỏ qua', () => {
    const r = buildAttentions({
      statusBreakdown: [{ status: 'FAILED', count: 0 }],
    });
    expect(r).toEqual([]);
  });
});
