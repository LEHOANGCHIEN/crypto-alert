import { useMemo, useState } from 'react';
import type { Candle } from '../../shared/api/types';
import { updateIndicators, type IndicatorData } from './lib';

/** Keeps the previous result so a live open-candle change recomputes only the last value. */
class IndicatorCache {
  private prev: IndicatorData | null = null;
  compute(candles: Candle[], maPeriods: number[]): IndicatorData {
    this.prev = updateIndicators(
      this.prev,
      candles.map((c) => c.close),
      maPeriods,
    );
    return this.prev;
  }
}

/** All indicator series for the loaded candles (every MA slot, RSI and MACD; drawing decides what is shown). */
export function useIndicatorData(candles: Candle[] | undefined, maPeriods: number[]): IndicatorData | null {
  const [cache] = useState(() => new IndicatorCache());
  const key = maPeriods.join(',');
  return useMemo(() => (candles?.length ? cache.compute(candles, key.split(',').map(Number)) : null), [cache, candles, key]);
}
