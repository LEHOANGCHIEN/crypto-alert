import { formatCompact, formatDateTime, formatPercent, formatPrice } from './index';

describe('format helpers', () => {
  it('prices follow locale (AC-I18N-04)', () => {
    expect(formatPrice(67234.5, 2, 'vi')).toBe('67.234,50');
    expect(formatPrice(67234.5, 2, 'en')).toBe('67,234.50');
  });
  it('percent always shows sign', () => {
    expect(formatPercent(1.234, 'en')).toBe('+1.23%');
    expect(formatPercent(-1.234, 'vi')).toBe('−1,23%');
    expect(formatPercent(0, 'en')).toBe('0.00%');
  });
  it('compact volume', () => {
    expect(formatCompact(1_200_000, 'en')).toBe('1.2M');
  });
  it('dates follow locale and timezone', () => {
    const ms = Date.UTC(2026, 10, 21, 7, 5); // 07:05 UTC
    expect(formatDateTime(ms, 'vi', 'Asia/Ho_Chi_Minh')).toBe('21/11/2026 14:05');
    expect(formatDateTime(ms, 'en', 'Asia/Ho_Chi_Minh')).toBe('11/21/2026, 2:05 PM');
    expect(formatDateTime(ms, 'vi', 'UTC')).toBe('21/11/2026 07:05');
  });
});
