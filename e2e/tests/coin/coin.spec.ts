import { test, expect, type APIRequestContext, type Page, type Request } from '@playwright/test';
import { resetApp } from '../../helpers/reset';
import { loginViaUi } from '../../helpers/auth';
import { pinOpenCandle, pushTick, lastPrice, left, viPrice, type Candle, type Ticker } from '../../helpers/market';
import { pricePrecision, round, viDateTime } from '../../helpers/alerts';

test.beforeEach(async ({ request }) => resetApp(request));

const signed = (v: number, d = 2) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${viPrice(Math.abs(v), d)}`;

const TZ = 'Asia/Ho_Chi_Minh'; // guest timezone
const RANGES = ['1D', '1W', '1M', '3M', '6M', 'YTD', '1Y'] as const;
type Range = (typeof RANGES)[number];

/** Whole days since 1 January in the guest timezone (independent of the app's helper). */
function ytdDays(now = Date.now()): number {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now).map((x) => [x.type, x.value]));
  return Math.round((Date.UTC(+p.year, +p.month - 1, +p.day) - Date.UTC(+p.year, 0, 1)) / 86_400_000);
}

/** AC-COIN-02: interval × limit the chart requests per range. */
const CHART_QUERY: Record<Range, () => { interval: string; limit: number }> = {
  '1D': () => ({ interval: '5m', limit: 288 }),
  '1W': () => ({ interval: '1h', limit: 168 }),
  '1M': () => ({ interval: '4h', limit: 180 }),
  '3M': () => ({ interval: '1d', limit: 90 }),
  '6M': () => ({ interval: '1d', limit: 180 }),
  YTD: () => ({ interval: '1d', limit: Math.max(1, ytdDays()) }),
  '1Y': () => ({ interval: '1d', limit: 365 }),
};

const isKlines = (r: Request, q: { interval: string; limit: number }) => {
  const u = new URL(r.url());
  return u.pathname === '/api/v1/market/klines' && u.searchParams.get('symbol') === 'BTCUSDT' && u.searchParams.get('interval') === q.interval && u.searchParams.get('limit') === String(q.limit);
};

async function apiKlines(request: APIRequestContext, symbol: string, q: { interval: string; limit: number }): Promise<Candle[]> {
  const res = await request.get(`/api/v1/market/klines?symbol=${symbol}&interval=${q.interval}&limit=${q.limit}`);
  expect(res.ok()).toBe(true);
  return ((await res.json()) as { data: Candle[] }).data;
}

async function apiTicker(request: APIRequestContext, symbol: string): Promise<Ticker & { highPrice: number; lowPrice: number; openPrice: number; volume: number }> {
  const res = await request.get('/api/v1/market/tickers');
  return ((await res.json()) as { data: (Ticker & { highPrice: number; lowPrice: number; volume: number })[] }).data.find((t) => t.symbol === symbol) as never;
}

const changeOf = (c: Candle[]) => ((c[c.length - 1].close - c[0].close) / c[0].close) * 100;
const viPercent = (v: number) => {
  const abs = new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(v));
  return `${Number(Math.abs(v).toFixed(2)) === 0 ? '' : v > 0 ? '+' : '−'}${abs}%`;
};
const viCompact = (v: number) => new Intl.NumberFormat('vi-VN', { notation: 'compact', maximumFractionDigits: 1 }).format(v);
const iso = (ms: number) => new Date(ms).toISOString();

/** Opens a coin page and waits until the ticker subscription is acknowledged (`data-live`). */
async function openCoin(page: Page, symbol = 'BTCUSDT') {
  await page.goto(`/coin/${symbol}`);
  await expect(page.getByTestId('coin-page')).toHaveAttribute('data-live', 'true');
}

test('AC-COIN-01 coin header', async ({ page, request }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await pinOpenCandle(request, 'BTCUSDT');
  const precision = await pricePrecision(request, 'BTCUSDT');
  const ticker = await apiTicker(request, 'BTCUSDT');
  await openCoin(page);

  await expect(page.getByTestId('coin-avatar')).toHaveText('B');
  await expect(page.getByTestId('coin-name')).toHaveText('Bitcoin');
  await expect(page.getByTestId('coin-pair')).toHaveText('BTC/USDT · Binance Spot');
  await expect(page.getByTestId('coin-star-BTCUSDT')).toBeVisible();
  await expect(page.getByTestId('coin-price')).toHaveText(viPrice(ticker.lastPrice, precision));
  await expect(page.getByTestId('coin-change')).toHaveText(viPercent(ticker.priceChangePercent));
  await expect(page.getByTestId('coin-change-abs')).toHaveText(signed(ticker.lastPrice - ticker.openPrice, precision));
  const cls = (await page.getByTestId('coin-change').getAttribute('class')) ?? '';
  const parent = (await page.getByTestId('coin-change').evaluate((e) => e.parentElement?.className ?? '')) + cls;
  expect(parent).toMatch(ticker.priceChangePercent > 0 ? /text-up/ : /text-down/);
  await expect(page.getByTestId('coin-updated')).toHaveText(/^Cập nhật lúc \d{2}:\d{2}:\d{2} \(GMT\+7\) · thay đổi 24 giờ$/);

  // A mock tick updates the price within 2 s.
  const price = round(ticker.lastPrice + 123, precision);
  const deadline = Date.now() + 2000;
  await pushTick(request, 'BTCUSDT', price);
  await expect(page.getByTestId('coin-price')).toHaveText(viPrice(price, precision), { timeout: left(deadline) });

  // Star: guest gets the login prompt (nothing saved); logged-in user adds and removes (watchlist rules of F6).
  await page.getByTestId('coin-star-BTCUSDT').click();
  await expect(page.getByTestId('watchlist-login-prompt')).toBeVisible();
  await expect(page.getByTestId('coin-star-BTCUSDT')).toHaveAttribute('aria-pressed', 'false');
  await loginViaUi(page);
  await openCoin(page);
  // The demo user already watches BTCUSDT (seed): the star is filled; click removes, click again adds.
  await expect(page.getByTestId('coin-star-BTCUSDT')).toHaveAttribute('aria-pressed', 'true');
  const removed = page.waitForResponse((r) => r.url().includes('/api/v1/watchlist/BTCUSDT') && r.request().method() === 'DELETE' && r.status() !== 401);
  await page.getByTestId('coin-star-BTCUSDT').click();
  expect((await removed).ok()).toBe(true);
  await expect(page.getByTestId('coin-star-BTCUSDT')).toHaveAttribute('aria-pressed', 'false');
  const added = page.waitForResponse((r) => r.url().includes('/api/v1/watchlist/BTCUSDT') && r.request().method() === 'PUT' && r.status() !== 401);
  await page.getByTestId('coin-star-BTCUSDT').click();
  expect((await added).ok()).toBe(true);
  await expect(page.getByTestId('coin-star-BTCUSDT')).toHaveAttribute('aria-pressed', 'true');

  // "Open full chart" → the trade page; the pair name in the trade chart header links back here.
  await page.getByTestId('coin-open-chart').click();
  await expect(page).toHaveURL(/\/trade\/BTCUSDT$/);
  await expect(page.getByTestId('chart-root')).toHaveAttribute('data-live', 'BTCUSDT:1h');
  await page.getByTestId('chart-symbol-link').click();
  await expect(page).toHaveURL(/\/coin\/BTCUSDT$/);

  // Lower-case URL is normalized; an unknown pair shows a translated message with a link to BTCUSDT.
  await page.goto('/coin/ethusdt');
  await expect(page).toHaveURL(/\/coin\/ETHUSDT$/);
  await expect(page.getByTestId('coin-name')).toHaveText('Ethereum');
  await page.goto('/coin/FAKEUSDT');
  await expect(page.getByTestId('coin-not-found')).toContainText('Không tìm thấy cặp');
  await page.getByTestId('coin-not-found-link').click();
  await expect(page).toHaveURL(/\/coin\/BTCUSDT$/);
  await expect(page.getByTestId('coin-name')).toHaveText('Bitcoin');
});

test('AC-COIN-02 range chart', async ({ page, request }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await pinOpenCandle(request, 'BTCUSDT');
  const precision = await pricePrecision(request, 'BTCUSDT');
  const chart = page.getByTestId('coin-chart');

  // Default range 1D = 5m × 288.
  const first = page.waitForRequest((r) => isKlines(r, CHART_QUERY['1D']()));
  await openCoin(page);
  await first;
  await expect(page.getByTestId('coin-range-1D')).toHaveAttribute('aria-pressed', 'true');
  await expect(chart).toHaveAttribute('data-range', '1D');
  await expect(chart).toHaveAttribute('data-candle-count', '288');
  await expect(page.locator('#tv-attr-logo')).toBeVisible(); // attribution logo stays on

  // Every range requests exactly its interval × limit; the area is colored by the range's change; the dashed line sits at the first close.
  for (const range of [...RANGES.slice(1), '1D' as const]) {
    const q = CHART_QUERY[range]();
    const requested = page.waitForRequest((r) => isKlines(r, q));
    await page.getByTestId(`coin-range-${range}`).click();
    await requested;
    await expect(page.getByTestId(`coin-range-${range}`)).toHaveAttribute('aria-pressed', 'true');
    await expect(chart).toHaveAttribute('data-range', range);
    await expect(chart).toHaveAttribute('data-candle-count', String(q.limit));
    const candles = await apiKlines(request, 'BTCUSDT', q);
    expect(candles).toHaveLength(q.limit);
    const change = changeOf(candles);
    await expect(chart).toHaveAttribute('data-direction', change > 0 ? 'up' : change < 0 ? 'down' : 'flat');
    await expect(chart).toHaveAttribute('data-first-close', String(candles[0].close));
    await expect(chart).toHaveAttribute('data-last-close', String(candles[candles.length - 1].close));
    // The line color is the up/down token of the range's direction.
    await expect(chart).toHaveAttribute('data-series-color', (await chart.getAttribute(change > 0 ? 'data-chart-up' : 'data-chart-down')) as string);
  }

  // Crosshair tooltip shows time + price of the hovered point.
  const candles = await apiKlines(request, 'BTCUSDT', CHART_QUERY['1D']());
  const box = (await chart.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 4 });
  const tip = page.getByTestId('coin-tooltip');
  await expect(tip).toBeVisible();
  const time = Number(await tip.getAttribute('data-time'));
  const price = Number(await tip.getAttribute('data-price'));
  const hovered = candles.find((c) => c.openTime === time);
  expect(hovered).toBeDefined();
  expect(price).toBe((hovered as Candle).close);
  await expect(tip).toContainText(viDateTime(iso(time)));
  await expect(tip).toContainText(viPrice(price, precision));
  await page.mouse.move(box.x + box.width / 2, box.y - 40); // leaving the chart hides it
  await expect(tip).toHaveCount(0);
});

test('AC-COIN-03 performance tiles', async ({ page, request }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await pinOpenCandle(request, 'BTCUSDT');
  await openCoin(page);

  // Expected values computed independently from the same klines (e2e checks 24h and 1M exactly; the rest too).
  const daily = await apiKlines(request, 'BTCUSDT', { interval: '1d', limit: 365 });
  const expected: Record<Range, number> = {
    '1D': changeOf(await apiKlines(request, 'BTCUSDT', { interval: '5m', limit: 288 })),
    '1W': changeOf(await apiKlines(request, 'BTCUSDT', { interval: '1h', limit: 168 })),
    '1M': changeOf(await apiKlines(request, 'BTCUSDT', { interval: '4h', limit: 180 })),
    '3M': changeOf(daily.slice(-90)),
    '6M': changeOf(daily.slice(-180)),
    YTD: changeOf(daily.slice(-Math.max(1, ytdDays()))),
    '1Y': changeOf(daily),
  };
  for (const range of RANGES) {
    const tile = page.getByTestId(`coin-tile-value-${range}`);
    await expect(tile).toHaveText(viPercent(expected[range]));
    const sign = Number(Math.abs(expected[range]).toFixed(2)) === 0 ? 'flat' : expected[range] > 0 ? 'up' : 'down';
    if (sign !== 'flat') await expect(tile).toHaveClass(sign === 'up' ? /text-up/ : /text-down/);
  }
  await expect(page.getByTestId('coin-tile-1D')).toHaveAttribute('aria-pressed', 'true'); // default range

  // Clicking a tile selects that range in the chart (and requests its interval × limit).
  const q = CHART_QUERY['1M']();
  const requested = page.waitForRequest((r) => isKlines(r, q));
  await page.getByTestId('coin-tile-1M').click();
  await requested;
  await expect(page.getByTestId('coin-tile-1M')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('coin-tile-1D')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByTestId('coin-range-1M')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('coin-chart')).toHaveAttribute('data-range', '1M');
  await expect(page.getByTestId('coin-chart')).toHaveAttribute('data-candle-count', String(q.limit));
});

test('AC-COIN-04 key stats', async ({ page, request }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await pinOpenCandle(request, 'BTCUSDT');
  await pushTick(request, 'BTCUSDT', (await lastPrice(request, 'BTCUSDT')) + 10); // widens the 24h range a little
  const precision = await pricePrecision(request, 'BTCUSDT');
  const ticker = await apiTicker(request, 'BTCUSDT');
  const daily = await apiKlines(request, 'BTCUSDT', { interval: '1d', limit: 365 });
  await openCoin(page); // guest: the page works without login

  const stat = (key: string) => page.getByTestId(`coin-stat-${key}`);
  await expect(stat('open')).toHaveText(viPrice(ticker.openPrice, precision));
  await expect(stat('high')).toHaveText(viPrice(ticker.highPrice, precision));
  await expect(stat('low')).toHaveText(viPrice(ticker.lowPrice, precision));
  await expect(stat('volBase')).toHaveText(viPrice(ticker.volume, 2));
  await expect(stat('volQuote')).toHaveText(viCompact(ticker.quoteVolume));
  await expect(stat('high52')).toHaveText(viPrice(Math.max(...daily.map((c) => c.high)), precision));
  await expect(stat('low52')).toHaveText(viPrice(Math.min(...daily.map((c) => c.low)), precision));
  await expect(page.getByTestId('coin-stats')).toContainText('Thống kê chính');

  // Desktop: chart and stats side by side.
  const chartBox = (await page.getByTestId('coin-chart').boundingBox())!;
  const statsBox = (await page.getByTestId('coin-stats').boundingBox())!;
  expect(statsBox.x).toBeGreaterThanOrEqual(chartBox.x + chartBox.width);
  expect(statsBox.y).toBeLessThan(chartBox.y + chartBox.height);

  // Mobile 390×844: single column (stats below the chart and the tiles), no horizontal scroll.
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByTestId('coin-chart')).toHaveAttribute('data-candle-count', '288');
  const tilesBox = (await page.getByTestId('coin-tile-1Y').boundingBox())!;
  const m = {
    chart: (await page.getByTestId('coin-chart').boundingBox())!,
    stats: (await page.getByTestId('coin-stats').boundingBox())!,
  };
  expect(m.stats.y).toBeGreaterThanOrEqual(tilesBox.y + tilesBox.height);
  expect(m.stats.x).toBeLessThan(m.chart.x + m.chart.width / 2);
  expect(m.stats.x + m.stats.width).toBeLessThanOrEqual(390);
  const overflow = await page.evaluate(() => ({
    page: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    main: (document.querySelector('main') as HTMLElement).scrollWidth - (document.querySelector('main') as HTMLElement).clientWidth,
  }));
  expect(overflow.page).toBeLessThanOrEqual(0);
  expect(overflow.main).toBeLessThanOrEqual(0);
});
