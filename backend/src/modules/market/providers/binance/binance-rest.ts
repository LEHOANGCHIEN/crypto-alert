import { AppError } from '../../../../common/app-error';
import type { Candle, Interval, SymbolInfo, Ticker } from '../../market.types';

/** Decimals needed to represent a tickSize string such as "0.01000000" → 2, "1.00000000" → 0. */
export function tickSizeToPrecision(tickSize: string): number {
  const n = Number(tickSize);
  if (!Number.isFinite(n) || n <= 0) return 8;
  const [, frac = ''] = n.toFixed(8).split('.');
  const trimmed = frac.replace(/0+$/, '');
  return trimmed.length;
}

type RawExchangeInfo = {
  symbols?: {
    symbol: string;
    status: string;
    baseAsset: string;
    quoteAsset: string;
    isSpotTradingAllowed?: boolean;
    filters?: { filterType: string; tickSize?: string }[];
  }[];
};

/** exchangeInfo → USDT + TRADING + spot pairs sorted by symbol (API.md §3.3). */
export function parseExchangeInfo(raw: RawExchangeInfo): SymbolInfo[] {
  const out: SymbolInfo[] = [];
  for (const s of raw.symbols ?? []) {
    if (s.quoteAsset !== 'USDT' || s.status !== 'TRADING' || s.isSpotTradingAllowed === false) continue;
    const tickSize = Number(s.filters?.find((f) => f.filterType === 'PRICE_FILTER')?.tickSize ?? '0.00000001');
    out.push({
      symbol: s.symbol,
      baseAsset: s.baseAsset,
      quoteAsset: 'USDT',
      tickSize,
      pricePrecision: tickSizeToPrecision(String(tickSize.toFixed(8))),
    });
  }
  return out.sort((a, b) => (a.symbol < b.symbol ? -1 : a.symbol > b.symbol ? 1 : 0));
}

type RawTicker = {
  symbol: string;
  lastPrice: string;
  openPrice: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  quoteVolume: string;
  closeTime: number;
};

/** ticker/24hr → Ticker[] for the given symbol set, sorted by quoteVolume desc. */
export function parseTickers(raw: RawTicker[], allowed: Set<string>): Ticker[] {
  const out: Ticker[] = [];
  for (const t of raw) {
    if (!allowed.has(t.symbol)) continue;
    const lastPrice = Number(t.lastPrice);
    const openPrice = Number(t.openPrice);
    out.push({
      symbol: t.symbol,
      lastPrice,
      openPrice,
      highPrice: Number(t.highPrice),
      lowPrice: Number(t.lowPrice),
      priceChangePercent: openPrice > 0 ? ((lastPrice - openPrice) / openPrice) * 100 : 0,
      volume: Number(t.volume),
      quoteVolume: Number(t.quoteVolume),
      eventTime: t.closeTime,
    });
  }
  return out.sort((a, b) => b.quoteVolume - a.quoteVolume);
}

/** klines row → Candle. `now` decides isClosed (closeTime < now). */
export function parseKlines(rows: unknown[][], now: number): Candle[] {
  return rows.map((r) => ({
    openTime: Number(r[0]),
    open: Number(r[1]),
    high: Number(r[2]),
    low: Number(r[3]),
    close: Number(r[4]),
    volume: Number(r[5]),
    closeTime: Number(r[6]),
    quoteVolume: Number(r[7]),
    isClosed: Number(r[6]) < now,
  }));
}

/** Thin REST client for the public binance.vision endpoints. HTTP errors → MARKET_DATA_UNAVAILABLE. */
export class BinanceRestClient {
  constructor(
    private readonly baseUrl: string,
    private readonly fetchFn: typeof fetch = fetch,
  ) {}

  private async getJson<T>(path: string, params: Record<string, string | number> = {}): Promise<T> {
    const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString();
    let res: Response;
    try {
      res = await this.fetchFn(`${this.baseUrl}${path}${qs ? `?${qs}` : ''}`, { signal: AbortSignal.timeout(10_000) });
    } catch {
      throw new AppError('MARKET_DATA_UNAVAILABLE');
    }
    // 429 / 418 = rate limited, 451 = blocked region, anything else non-2xx is also unusable.
    if (!res.ok) throw new AppError('MARKET_DATA_UNAVAILABLE');
    return (await res.json()) as T;
  }

  async listSymbols(): Promise<SymbolInfo[]> {
    return parseExchangeInfo(await this.getJson<RawExchangeInfo>('/api/v3/exchangeInfo'));
  }

  async get24hTickers(symbols: Set<string>): Promise<Ticker[]> {
    return parseTickers(await this.getJson<RawTicker[]>('/api/v3/ticker/24hr'), symbols);
  }

  async getKlines(symbol: string, interval: Interval, opts: { limit: number; endTime?: number }): Promise<Candle[]> {
    const params: Record<string, string | number> = { symbol, interval, limit: opts.limit };
    if (opts.endTime !== undefined) params.endTime = opts.endTime;
    return parseKlines(await this.getJson<unknown[][]>('/api/v3/klines', params), Date.now());
  }
}
