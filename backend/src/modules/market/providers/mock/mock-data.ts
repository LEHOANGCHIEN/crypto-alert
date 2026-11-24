import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Candle, Interval } from '../../market.types';

export const INTERVAL_MS: Record<Interval, number> = {
  '1m': 60_000,
  '5m': 300_000,
  '15m': 900_000,
  '1h': 3_600_000,
  '4h': 14_400_000,
  '1d': 86_400_000,
};

/** ARCHITECTURE §8 symbols. ETHBTC and BTCUSDC are NOT USDT pairs and must be filtered out by the app. */
type MockSymbol = { symbol: string; base: string; quote: string; tick: string; last: number; open24h: number; quoteVolume: number };

// BTCUSDT `last` is replaced by the fixture's last close at runtime.
export const MOCK_SYMBOLS: MockSymbol[] = [
  { symbol: 'BTCUSDT', base: 'BTC', quote: 'USDT', tick: '0.01000000', last: 67234.5, open24h: 66000, quoteVolume: 900_000_000 },
  { symbol: 'ETHUSDT', base: 'ETH', quote: 'USDT', tick: '0.01000000', last: 3510.25, open24h: 3400, quoteVolume: 450_000_000 },
  { symbol: 'SOLUSDT', base: 'SOL', quote: 'USDT', tick: '0.01000000', last: 142.35, open24h: 150, quoteVolume: 120_000_000 },
  { symbol: 'XRPUSDT', base: 'XRP', quote: 'USDT', tick: '0.00010000', last: 0.5234, open24h: 0.5234, quoteVolume: 80_000_000 },
  { symbol: 'BNBUSDT', base: 'BNB', quote: 'USDT', tick: '0.01000000', last: 585.1, open24h: 600, quoteVolume: 60_000_000 },
  { symbol: 'DOGEUSDT', base: 'DOGE', quote: 'USDT', tick: '0.00001000', last: 0.12345, open24h: 0.12, quoteVolume: 40_000_000 },
  { symbol: 'ADAUSDT', base: 'ADA', quote: 'USDT', tick: '0.00010000', last: 0.4521, open24h: 0.46, quoteVolume: 20_000_000 },
  { symbol: 'LINKUSDT', base: 'LINK', quote: 'USDT', tick: '0.00100000', last: 14.532, open24h: 14, quoteVolume: 10_000_000 },
  // Non-USDT pairs: bigger volume than most, to prove they are filtered rather than just ranked low.
  { symbol: 'ETHBTC', base: 'ETH', quote: 'BTC', tick: '0.00001000', last: 0.052, open24h: 0.051, quoteVolume: 999_000_000 },
  { symbol: 'BTCUSDC', base: 'BTC', quote: 'USDC', tick: '0.01000000', last: 67230, open24h: 66000, quoteVolume: 998_000_000 },
];

type FixtureCandle = { openTime: number; closeTime: number; open: number; high: number; low: number; close: number; volume: number; quoteVolume: number };

let fixtureCache: FixtureCandle[] | null = null;
export function loadBtcFixture(): FixtureCandle[] {
  fixtureCache ??= JSON.parse(readFileSync(join(__dirname, 'fixtures', 'BTCUSDT-1h.json'), 'utf8')) as FixtureCandle[];
  return fixtureCache;
}

/** Deterministic hash → [0,1). */
function rand(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h ^= h >>> 13;
  h = Math.imul(h, 0x5bd1e995);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

/** Smooth-ish price curve, pure function of the bucket index k so every run produces identical candles. */
function priceAt(symbol: string, interval: Interval, k: number, base: number): number {
  const wave = 0.04 * Math.sin(k / 37) + 0.02 * Math.sin(k / 9);
  const noise = (rand(`${symbol}|${interval}|${k}`) - 0.5) * 0.01;
  return base * (1 + wave + noise);
}

function round(v: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(v * f) / f;
}

/** Seeded candles for (symbol, interval) ending at the open candle containing `now`. */
export function generateCandles(symbol: string, interval: Interval, lastPrice: number, limit: number, endOpenTime: number, now: number): Candle[] {
  const ms = INTERVAL_MS[interval];
  const currentOpen = Math.floor(now / ms) * ms;
  const decimals = lastPrice >= 1000 ? 2 : lastPrice >= 10 ? 3 : 6;
  const out: Candle[] = [];
  for (let i = limit - 1; i >= 0; i--) {
    const openTime = endOpenTime - i * ms;
    const k = Math.floor(openTime / ms);
    const isCurrent = openTime === currentOpen;
    const open = priceAt(symbol, interval, k, lastPrice);
    const close = isCurrent ? lastPrice : priceAt(symbol, interval, k + 1, lastPrice);
    const spread = Math.abs(open) * (0.002 + rand(`${symbol}|${interval}|h${k}`) * 0.004);
    const high = Math.max(open, close) + spread;
    const low = Math.min(open, close) - spread * (0.5 + rand(`${symbol}|${interval}|l${k}`));
    const volume = 10 + rand(`${symbol}|${interval}|v${k}`) * 90;
    out.push({
      openTime,
      closeTime: openTime + ms - 1,
      open: round(open, decimals),
      high: round(high, decimals),
      low: round(low, decimals),
      close: round(close, decimals),
      volume: round(volume, 3),
      quoteVolume: round(volume * close, 2),
      isClosed: !isCurrent && openTime + ms - 1 < now,
    });
  }
  return out;
}

/** BTCUSDT 1h fixture shifted so its last candle is the open candle containing `now` (hour-aligned shift). */
export function fixtureCandles(limit: number, endOpenTime: number, now: number): Candle[] {
  const fx = loadBtcFixture();
  const ms = INTERVAL_MS['1h'];
  const currentOpen = Math.floor(now / ms) * ms;
  const shift = currentOpen - fx[fx.length - 1].openTime;
  const all: Candle[] = fx.map((c) => ({
    ...c,
    openTime: c.openTime + shift,
    closeTime: c.closeTime + shift,
    isClosed: c.openTime + shift !== currentOpen,
  }));
  return all.filter((c) => c.openTime <= endOpenTime).slice(-limit);
}
