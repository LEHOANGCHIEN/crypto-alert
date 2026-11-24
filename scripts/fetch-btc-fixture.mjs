// One-off: fetch 1000 real BTCUSDT 1h candles and save them as the MockProvider fixture.
// Usage: node scripts/fetch-btc-fixture.mjs
import { writeFileSync } from 'node:fs';

const url = 'https://data-api.binance.vision/api/v3/klines?symbol=BTCUSDT&interval=1h&limit=1000';
const res = await fetch(url);
if (!res.ok) throw new Error(`HTTP ${res.status}`);
const rows = await res.json();
const candles = rows.map((r) => ({
  openTime: r[0], closeTime: r[6], open: Number(r[1]), high: Number(r[2]), low: Number(r[3]),
  close: Number(r[4]), volume: Number(r[5]), quoteVolume: Number(r[7]),
}));
const out = new URL('../backend/src/modules/market/providers/mock/fixtures/BTCUSDT-1h.json', import.meta.url);
writeFileSync(out, JSON.stringify(candles));
console.log(`wrote ${candles.length} candles to ${out.pathname}`);
