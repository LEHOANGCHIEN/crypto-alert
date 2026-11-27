import { daysSinceYearStart, formatGmtOffset, formatCompact, formatDateTime, formatPercent, formatPrice, formatTickMark, priceDirection } from './index';

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
  it('compact volume in Vietnamese uses Tr / Tỷ', () => {
    expect(formatCompact(1_200_000, 'vi')).toMatch(/^1,2\s?Tr$/);
    expect(formatCompact(2_500_000_000, 'vi')).toMatch(/^2,5\s?T/);
  });
  it('price precision is applied even for tiny prices', () => {
    expect(formatPrice(0.12345, 5, 'vi')).toBe('0,12345');
    expect(formatPrice(3, 0, 'en')).toBe('3');
  });
  it('tick marks use the user timezone', () => {
    const ms = Date.UTC(2026, 10, 21, 23, 30); // 23:30 UTC = 06:30 next day in Ho Chi Minh
    expect(formatTickMark(ms, 3, 'vi', 'UTC')).toBe('23:30');
    expect(formatTickMark(ms, 3, 'vi', 'Asia/Ho_Chi_Minh')).toBe('06:30');
    expect(formatTickMark(ms, 2, 'en', 'UTC')).toBe('21');
    expect(formatTickMark(ms, 2, 'en', 'Asia/Ho_Chi_Minh')).toBe('22');
    expect(formatTickMark(ms, 0, 'en', 'UTC')).toBe('2026');
  });
  it('price direction treats a change that rounds to 0.00 as flat', () => {
    expect(priceDirection(1.234)).toBe('up');
    expect(priceDirection(-0.01)).toBe('down');
    expect(priceDirection(0.004)).toBe('flat');
    expect(priceDirection(0)).toBe('flat');
  });
});

describe('formatFileStamp', () => {
  it('formats yyyyMMdd-HHmm in the given timezone', async () => {
    const { formatFileStamp } = await import('./index');
    const t = Date.UTC(2026, 10, 26, 7, 5, 59); // 26/11/2026 07:05:59 UTC
    expect(formatFileStamp(t, 'UTC')).toBe('20261126-0705');
    expect(formatFileStamp(t, 'Asia/Ho_Chi_Minh')).toBe('20261126-1405');
  });
});

describe('formatGmtOffset / daysSinceYearStart', () => {
  it('names the offset of the timezone', () => {
    expect(formatGmtOffset(Date.UTC(2026, 10, 27, 12), 'Asia/Ho_Chi_Minh')).toBe('GMT+7');
    expect(formatGmtOffset(Date.UTC(2026, 10, 27, 12), 'UTC')).toBe('GMT+0');
  });
  it('counts days since 1 January in the given timezone', () => {
    expect(daysSinceYearStart(Date.UTC(2026, 0, 1, 5), 'UTC')).toBe(0);
    expect(daysSinceYearStart(Date.UTC(2026, 10, 27, 5), 'UTC')).toBe(330);
    // 2026-12-31 20:00 UTC is already 1 Jan 2027 in Ho Chi Minh City (UTC+7).
    expect(daysSinceYearStart(Date.UTC(2026, 11, 31, 20), 'Asia/Ho_Chi_Minh')).toBe(0);
    expect(daysSinceYearStart(Date.UTC(2026, 11, 31, 20), 'UTC')).toBe(364);
  });
});
