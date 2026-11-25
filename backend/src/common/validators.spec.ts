import { decimalPlaces, isValidTimezone } from './validators';

describe('isValidTimezone', () => {
  it.each(['Asia/Ho_Chi_Minh', 'Asia/Saigon', 'UTC'])('accepts %s', (tz) => {
    expect(isValidTimezone(tz)).toBe(true);
  });
  it.each(['Mars/Base', '', 'x'.repeat(65), 42, undefined])('rejects %p', (tz) => {
    expect(isValidTimezone(tz)).toBe(false);
  });
});

describe('decimalPlaces', () => {
  it.each([
    [1, 0],
    [1.5, 1],
    [0.12345678, 8],
    [1.123456789, 9],
    [1e-7, 7],
    [1e-9, 9],
    [1.5e-8, 9],
    [1e21, 0],
    [67234.5, 1],
  ])('%p has %p decimals', (v, d) => {
    expect(decimalPlaces(v)).toBe(d);
  });
  it('non-finite numbers have infinite decimals', () => {
    expect(decimalPlaces(Number.NaN)).toBe(Number.POSITIVE_INFINITY);
  });
});
