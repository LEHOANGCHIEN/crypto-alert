// One-off: compute the golden indicator values for AC-IND-06 from the MockProvider BTCUSDT-1h fixture.
// Uses ONLY the independent oracle library `technicalindicators` (never app code), per ARCHITECTURE §8.
// Usage: npm run golden -w e2e
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { SMA, AverageGain, AverageLoss, MACD } = require('technicalindicators');

const fixtureUrl = new URL('../../backend/src/modules/market/providers/mock/fixtures/BTCUSDT-1h.json', import.meta.url);
const candles = JSON.parse(readFileSync(fixtureUrl, 'utf8'));
// The fixture's last candle is the open one; the golden values are for the last CLOSED candle.
const index = candles.length - 2;
const closes = candles.slice(0, index + 1).map((c) => c.close);
const last = (arr) => arr[arr.length - 1];

const gain = last(AverageGain.calculate({ period: 14, values: closes }));
const loss = last(AverageLoss.calculate({ period: 14, values: closes }));
// The oracle RSI rounds to 2 decimals; rebuild it from the oracle's unrounded Wilder averages.
const rsi14 = loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);
const m = last(MACD.calculate({ values: closes, fastPeriod: 12, slowPeriod: 26, signalPeriod: 9, SimpleMAOscillator: false, SimpleMASignal: false }));

const golden = {
  source: 'backend/src/modules/market/providers/mock/fixtures/BTCUSDT-1h.json via technicalindicators (oracle)',
  symbol: 'BTCUSDT',
  interval: '1h',
  index,
  close: candles[index].close,
  ma7: last(SMA.calculate({ period: 7, values: closes })),
  ma25: last(SMA.calculate({ period: 25, values: closes })),
  ma99: last(SMA.calculate({ period: 99, values: closes })),
  rsi14,
  macd: m.MACD,
  signal: m.signal,
  hist: m.histogram,
};
const out = new URL('../fixtures/indicators.golden.json', import.meta.url);
writeFileSync(out, `${JSON.stringify(golden, null, 2)}\n`);
console.log(golden);
