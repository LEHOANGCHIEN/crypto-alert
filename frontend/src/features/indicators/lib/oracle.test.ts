/**
 * Accuracy check against an independent reference implementation (SPEC §4.1): after a warm-up of 250 candles every
 * value must equal the oracle library `technicalindicators` within 0.01 %.
 */
import { AverageGain, AverageLoss, EMA, MACD, SMA } from 'technicalindicators';
import { computeIndicators, ema, MACD_FAST, MACD_SIGNAL, MACD_SLOW, RSI_PERIOD, type Series } from './index';
import { randomWalk } from './random-walk.testutil';

const WARM_UP = 250;
const REL = 1e-4; // 0.01 %

/** Oracle outputs start later than the input; `offset` = input index of the oracle's first value. */
function expectMatches(ours: Series, oracle: (number | undefined)[], offset: number, name: string) {
  let checked = 0;
  for (let i = WARM_UP; i < ours.length; i++) {
    const ref = oracle[i - offset];
    const v = ours[i];
    if (ref === undefined || v === null) throw new Error(`${name}: missing value at index ${i}`);
    if (Math.abs(v - ref) > REL * Math.abs(ref) + 1e-9) throw new Error(`${name}[${i}] = ${v}, oracle ${ref}`);
    checked++;
  }
  expect(checked).toBe(ours.length - WARM_UP);
}

for (const [label, closes] of [
  ['random walk (seed 42)', randomWalk(1000, 42)],
  ['random walk (seed 2026)', randomWalk(1000, 2026, 0.35)],
] as const) {
  describe(`indicators vs technicalindicators — ${label}`, () => {
    const data = computeIndicators(closes, [7, 25, 99, 200]);

    it('MA(7), MA(25), MA(99), MA(200)', () => {
      [7, 25, 99, 200].forEach((n, k) => expectMatches(data.ma[k], SMA.calculate({ period: n, values: [...closes] }), n - 1, `MA(${n})`));
    });

    it('EMA(12), EMA(26)', () => {
      for (const n of [12, 26]) expectMatches(ema(closes, n), EMA.calculate({ period: n, values: [...closes] }), n - 1, `EMA(${n})`);
    });

    it('RSI(14) (oracle RSI rounds to 2 decimals, so it is rebuilt from the oracle Wilder averages)', () => {
      const gain = AverageGain.calculate({ period: RSI_PERIOD, values: [...closes] });
      const loss = AverageLoss.calculate({ period: RSI_PERIOD, values: [...closes] });
      const ref = gain.map((g, k) => (loss[k] === 0 ? 100 : 100 - 100 / (1 + g / loss[k])));
      expectMatches(data.rsi, ref, RSI_PERIOD, 'RSI');
    });

    it('MACD(12, 26, 9) line, signal and histogram', () => {
      const ref = MACD.calculate({
        values: [...closes],
        fastPeriod: MACD_FAST,
        slowPeriod: MACD_SLOW,
        signalPeriod: MACD_SIGNAL,
        SimpleMAOscillator: false,
        SimpleMASignal: false,
      });
      const offset = MACD_SLOW - 1;
      expectMatches(data.macd, ref.map((r) => r.MACD), offset, 'MACD');
      expectMatches(data.signal, ref.map((r) => r.signal), offset, 'Signal');
      expectMatches(data.hist, ref.map((r) => r.histogram), offset, 'Hist');
    });
  });
}
