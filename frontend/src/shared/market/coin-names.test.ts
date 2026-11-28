import { describe, expect, it } from 'vitest';
import { coinName, COIN_NAMES } from './coin-names';

describe('coinName', () => {
  it('knows at least the 18 required assets', () => {
    for (const a of ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'DOGE', 'ADA', 'TRX', 'AVAX', 'LINK', 'DOT', 'LTC', 'TON', 'SHIB', 'NEAR', 'UNI', 'PEPE', 'SUI']) {
      expect(COIN_NAMES[a]).toBeTruthy();
    }
    expect(coinName('btc')).toBe('Bitcoin');
  });
  it('returns undefined for unknown assets', () => {
    expect(coinName('FOO')).toBeUndefined();
  });
});
