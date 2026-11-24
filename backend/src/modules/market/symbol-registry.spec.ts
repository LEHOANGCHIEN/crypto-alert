import { SymbolRegistry } from './symbol-registry';
import type { MarketDataProvider } from './providers/market-data-provider.interface';
import type { SymbolInfo } from './market.types';

const btc: SymbolInfo = { symbol: 'BTCUSDT', baseAsset: 'BTC', quoteAsset: 'USDT', tickSize: 0.01, pricePrecision: 2 };

function registry(listSymbols: () => Promise<SymbolInfo[]>) {
  return new SymbolRegistry({ listSymbols } as unknown as MarketDataProvider);
}

describe('SymbolRegistry', () => {
  it('loads lazily and serves list/get/require', async () => {
    const fn = jest.fn(async () => [btc]);
    const r = registry(fn);
    expect(await r.list()).toEqual([btc]);
    expect(await r.get('BTCUSDT')).toEqual(btc);
    expect(await r.get('FAKEUSDT')).toBeUndefined();
    await expect(r.require('FAKEUSDT')).rejects.toMatchObject({ code: 'SYMBOL_NOT_FOUND' });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('throws MARKET_DATA_UNAVAILABLE when the provider fails before the first load', async () => {
    const r = registry(async () => {
      throw Object.assign(new Error('x'), { code: 'MARKET_DATA_UNAVAILABLE' });
    });
    await expect(r.list()).rejects.toMatchObject({ code: 'MARKET_DATA_UNAVAILABLE' });
  });

  it('keeps the previous list when a later refresh fails', async () => {
    let fail = false;
    const r = registry(async () => {
      if (fail) throw new Error('down');
      return [btc];
    });
    await r.list();
    fail = true;
    await expect(r.refresh()).rejects.toThrow('down');
    expect(await r.list()).toEqual([btc]);
  });

  it('shares one in-flight refresh between concurrent callers', async () => {
    const fn = jest.fn(async () => [btc]);
    const r = registry(fn);
    await Promise.all([r.list(), r.list(), r.list()]);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
