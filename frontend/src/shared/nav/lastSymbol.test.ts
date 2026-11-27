import { describe, expect, it } from 'vitest';
import { DEFAULT_SYMBOL, parseLastSymbol } from './lastSymbol';

describe('parseLastSymbol', () => {
  it('keeps a well-formed symbol', () => {
    expect(parseLastSymbol('ETHUSDT')).toBe('ETHUSDT');
  });

  it('falls back to BTCUSDT for missing or malformed values', () => {
    expect(parseLastSymbol(null)).toBe(DEFAULT_SYMBOL);
    expect(parseLastSymbol('')).toBe(DEFAULT_SYMBOL);
    expect(parseLastSymbol('eth usdt')).toBe(DEFAULT_SYMBOL);
    expect(parseLastSymbol('btcusdt')).toBe(DEFAULT_SYMBOL);
  });
});
