import { slugify, generateOrderNumber, randomToken } from './helpers';

describe('helpers', () => {
  it('slugifies Vietnamese names (SEO URLs)', () => {
    expect(slugify('Nồi cơm điện Sharp KS-N191ETV')).toBe('noi-com-dien-sharp-ks-n191etv');
    expect(slugify('Bộ dụng cụ sửa chữa nhà cửa')).toBe('bo-dung-cu-sua-chua-nha-cua');
    expect(slugify('Đèn thông minh')).toBe('den-thong-minh');
  });

  it('generates stable order numbers', () => {
    const n = generateOrderNumber(123);
    expect(n).toMatch(/^HM-\d{8}-000123$/);
  });

  it('generates random tokens of requested length', () => {
    const a = randomToken(40);
    expect(a).toHaveLength(40);
    expect(a).not.toBe(randomToken(40));
  });
});
