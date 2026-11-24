import type { Ticker } from '../market/market.types';
import { TickerBatcher } from './ticker-batcher';

const t = (symbol: string, lastPrice: number): Ticker => ({
  symbol, lastPrice, openPrice: 1, highPrice: 9, lowPrice: 0.1, priceChangePercent: 0, volume: 1, quoteVolume: 1, eventTime: 1,
});

describe('TickerBatcher', () => {
  let batches: { at: number; symbols: string[] }[];
  let batcher: TickerBatcher;

  beforeEach(() => {
    jest.useFakeTimers({ now: 10_000 });
    batches = [];
    batcher = new TickerBatcher((list) => batches.push({ at: Date.now(), symbols: list.map((x) => `${x.symbol}:${x.lastPrice}`) }));
  });
  afterEach(() => jest.useRealTimers());

  it('sends a burst as one batch right away, keeping the latest value per symbol', () => {
    batcher.add(t('AUSDT', 1));
    batcher.add(t('BUSDT', 1));
    batcher.add(t('AUSDT', 2));
    expect(batches).toHaveLength(0);
    jest.advanceTimersByTime(0);
    expect(batches).toEqual([{ at: 10_000, symbols: ['AUSDT:2', 'BUSDT:1'] }]);
  });

  it('never sends more than one batch per second', () => {
    batcher.add(t('AUSDT', 1));
    jest.advanceTimersByTime(0);
    batcher.add(t('AUSDT', 2));
    jest.advanceTimersByTime(500);
    batcher.add(t('AUSDT', 3));
    jest.advanceTimersByTime(499);
    expect(batches).toHaveLength(1);
    jest.advanceTimersByTime(1);
    expect(batches[1]).toEqual({ at: 11_000, symbols: ['AUSDT:3'] });
    for (let i = 1; i < batches.length; i++) expect(batches[i].at - batches[i - 1].at).toBeGreaterThanOrEqual(1000);
  });

  it('only sends symbols that changed since they were last sent', () => {
    batcher.add(t('AUSDT', 1));
    batcher.add(t('BUSDT', 1));
    jest.advanceTimersByTime(0);
    batcher.add(t('AUSDT', 1)); // unchanged
    batcher.add(t('BUSDT', 5));
    jest.advanceTimersByTime(1000);
    expect(batches[1].symbols).toEqual(['BUSDT:5']);
    batcher.add(t('BUSDT', 5)); // unchanged → no batch at all
    jest.advanceTimersByTime(2000);
    expect(batches).toHaveLength(2);
  });

  it('a quiet period lets the next batch go out immediately', () => {
    batcher.add(t('AUSDT', 1));
    jest.advanceTimersByTime(0);
    jest.advanceTimersByTime(5000);
    batcher.add(t('AUSDT', 2));
    jest.advanceTimersByTime(0);
    expect(batches[1]).toEqual({ at: 15_000, symbols: ['AUSDT:2'] });
  });

  it('reset forgets the last sent values', () => {
    batcher.add(t('AUSDT', 1));
    jest.advanceTimersByTime(0);
    batcher.reset();
    batcher.add(t('AUSDT', 1));
    jest.advanceTimersByTime(0);
    expect(batches).toHaveLength(2);
  });
});
