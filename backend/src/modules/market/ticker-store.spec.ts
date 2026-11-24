import { TickerStore } from './ticker-store';
import { PriceBus } from './price-bus';
import type { MarketDataProvider } from './providers/market-data-provider.interface';
import type { SymbolRegistry } from './symbol-registry';
import type { Ticker } from './market.types';

const t = (symbol: string, quoteVolume: number): Ticker => ({
  symbol, lastPrice: 1, openPrice: 1, highPrice: 1, lowPrice: 1, priceChangePercent: 0, volume: 1, quoteVolume, eventTime: 1,
});

function store(get24hTickers: () => Promise<Ticker[]>, bus = new PriceBus()) {
  const registry = { list: async () => [{ symbol: 'AAAUSDT' }, { symbol: 'BBBUSDT' }] } as unknown as SymbolRegistry;
  return new TickerStore({ get24hTickers } as unknown as MarketDataProvider, registry, bus);
}

describe('TickerStore', () => {
  it('sorts by quote volume desc and drops symbols unknown to the registry', async () => {
    const s = store(async () => [t('AAAUSDT', 5), t('ZZZUSDT', 999), t('BBBUSDT', 50)]);
    expect((await s.list()).map((x) => x.symbol)).toEqual(['BBBUSDT', 'AAAUSDT']);
    expect((await s.get('AAAUSDT'))?.quoteVolume).toBe(5);
    expect(await s.get('ZZZUSDT')).toBeUndefined();
  });

  it('throws MARKET_DATA_UNAVAILABLE when the provider fails before the first load', async () => {
    const s = store(async () => {
      throw new Error('down');
    });
    await expect(s.list()).rejects.toThrow('down');
  });

  it('keeps old data when a later refresh fails', async () => {
    let fail = false;
    const s = store(async () => {
      if (fail) throw new Error('down');
      return [t('AAAUSDT', 5)];
    });
    await s.list();
    fail = true;
    await expect(s.refresh()).rejects.toThrow('down');
    expect(await s.list()).toHaveLength(1);
  });

  it('applies live PriceBus tickers for known symbols only', async () => {
    const bus = new PriceBus();
    const s = store(async () => [t('AAAUSDT', 5)], bus);
    s.onModuleInit();
    await s.list();
    bus.emit('ticker', { ...t('AAAUSDT', 77), lastPrice: 2 });
    bus.emit('ticker', t('ZZZUSDT', 999));
    expect((await s.get('AAAUSDT'))?.lastPrice).toBe(2);
    expect((await s.get('AAAUSDT'))?.quoteVolume).toBe(77);
    expect(await s.get('ZZZUSDT')).toBeUndefined();
    s.onApplicationShutdown();
  });
});
