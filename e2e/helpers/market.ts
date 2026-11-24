import { expect, type APIRequestContext, type Page } from '@playwright/test';

/** Mock market controls (API.md §3.8). */
export type Candle = { openTime: number; closeTime: number; open: number; high: number; low: number; close: number; isClosed: boolean };
export type Ticker = { symbol: string; lastPrice: number; openPrice: number; priceChangePercent: number; quoteVolume: number };

async function data<T>(res: Awaited<ReturnType<APIRequestContext['post']>>): Promise<T> {
  if (!res.ok()) throw new Error(`${res.url()} → HTTP ${res.status()}`);
  return ((await res.json()) as { data: T }).data;
}

export const pushTick = async (request: APIRequestContext, symbol: string, price: number, quoteVolume?: number): Promise<Ticker> =>
  (await data<{ ticker: Ticker }>(await request.post('/api/v1/test/market/tick', { data: quoteVolume === undefined ? { symbol, price } : { symbol, price, quoteVolume } }))).ticker;

export const closeCandle = async (request: APIRequestContext, symbol: string, interval: string): Promise<{ closed: Candle; opened: Candle }> =>
  data(await request.post('/api/v1/test/market/close-candle', { data: { symbol, interval } }));

export const upstreamDisconnect = async (request: APIRequestContext, durationMs: number): Promise<void> => {
  await data(await request.post('/api/v1/test/market/disconnect', { data: { durationMs } }));
};

export const upstreamStreams = async (request: APIRequestContext): Promise<string[]> =>
  (await data<{ upstreamStreams: string[] }>(await request.get('/api/v1/test/market/stats'))).upstreamStreams;

export const lastPrice = async (request: APIRequestContext, symbol: string): Promise<number> =>
  ((await data<Ticker[]>(await request.get('/api/v1/market/tickers'))).find((t) => t.symbol === symbol) as Ticker).lastPrice;

/**
 * The mock's open candle follows the wall clock until it is first touched. Touch it (a tick at the current price)
 * before the page loads, so a minute boundary during the test cannot start a different candle.
 */
export async function pinOpenCandle(request: APIRequestContext, symbol: string): Promise<void> {
  await pushTick(request, symbol, await lastPrice(request, symbol));
}

/** Opens a chart URL and waits until its kline subscription is acknowledged (`data-live`). Returns the loaded candles. */
export async function openLiveChart(page: Page, url: string, liveKey: string): Promise<Candle[]> {
  const klines = page.waitForResponse((r) => /\/api\/v1\/market\/klines\?/.test(r.url()));
  await page.goto(url);
  const candles = ((await (await klines).json()) as { data: Candle[] }).data;
  await expect(page.getByTestId('chart-root')).toHaveAttribute('data-candle-count', String(candles.length));
  await expect(page.getByTestId('chart-root')).toHaveAttribute('data-live', liveKey);
  return candles;
}

/** Milliseconds left until `deadline` (for "within N s, measured from the mock push" assertions). */
export const left = (deadline: number): number => Math.max(1, deadline - Date.now());

export const viPrice = (v: number, d = 2): string => new Intl.NumberFormat('vi-VN', { minimumFractionDigits: d, maximumFractionDigits: d }).format(v);
