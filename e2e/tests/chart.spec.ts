import { test, expect, type Page } from '@playwright/test';
import { resetApp } from '../helpers/reset';
import { closeCandle, left, pinOpenCandle, openLiveChart, pushTick } from '../helpers/market';
import { cssVar, hoverCandle } from '../helpers/chart';
import { readFileSync } from 'node:fs';

test.beforeEach(async ({ request }) => resetApp(request));

type Candle = { openTime: number; closeTime: number; open: number; high: number; low: number; close: number; isClosed: boolean };

const KLINES = /\/api\/v1\/market\/klines\?/;

/** Opens the chart and returns the klines the page itself received. */
async function openChart(page: Page, url = '/trade/BTCUSDT'): Promise<Candle[]> {
  const responsePromise = page.waitForResponse((r) => KLINES.test(r.url()));
  await page.goto(url);
  const candles = ((await (await responsePromise).json()) as { data: Candle[] }).data;
  await expect(page.getByTestId('chart-root')).toHaveAttribute('data-candle-count', String(candles.length));
  return candles;
}

const viPrice = (v: number, d = 2) => new Intl.NumberFormat('vi-VN', { minimumFractionDigits: d, maximumFractionDigits: d }).format(v);

test('AC-CHART-01 chart renders with attribution logo', async ({ page, request }) => {
  await openChart(page);
  await expect(page.getByTestId('chart-root').locator('canvas').first()).toBeVisible();

  // Header: symbol, last price, 24h change (values come from the tickers API).
  const btc = ((await (await request.get('/api/v1/market/tickers')).json()).data as { symbol: string; lastPrice: number }[]).find(
    (t) => t.symbol === 'BTCUSDT',
  )!;
  await expect(page.getByTestId('chart-symbol')).toHaveText('BTC/USDT');
  await expect(page.getByTestId('chart-price')).toHaveText(viPrice(btc.lastPrice));
  await expect(page.getByTestId('chart-change')).toHaveText(/^[+−]\d+,\d{2}%$/);

  // TradingView attribution logo must be visible (licence requirement).
  const logo = page.locator('#tv-attr-logo');
  await expect(logo).toBeVisible();
  const box = (await logo.boundingBox())!;
  expect(box.width).toBeGreaterThan(10);
});

test('AC-CHART-02 timeframe switch and URL sync', async ({ page }) => {
  await openChart(page);
  for (const tf of ['1m', '5m', '15m', '1h', '4h', '1d']) await expect(page.getByTestId(`tf-${tf}`)).toBeVisible();
  await expect(page.getByTestId('tf-1h')).toHaveAttribute('aria-pressed', 'true');

  const req = page.waitForRequest((r) => KLINES.test(r.url()) && r.url().includes('interval=15m'));
  await page.getByTestId('tf-15m').click();
  await req;
  await expect(page).toHaveURL(/\/trade\/BTCUSDT\?tf=15m$/);
  await expect(page.getByTestId('tf-15m')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('tf-1h')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByTestId('chart-root')).toHaveAttribute('data-candle-count', '1000');

  await page.reload();
  await expect(page.getByTestId('tf-15m')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('chart-root')).toHaveAttribute('data-candle-count', '1000');
});

test('AC-CHART-03 loads 1000 candles', async ({ page }) => {
  const candles = await openChart(page);
  expect(candles).toHaveLength(1000);
  expect(candles[candles.length - 1].isClosed).toBe(false);
  expect(candles.slice(0, -1).every((c) => c.isClosed)).toBe(true);
  for (let i = 1; i < candles.length; i++) expect(candles[i].openTime).toBeGreaterThan(candles[i - 1].openTime);
  await expect(page.getByTestId('chart-root')).toHaveAttribute('data-last-open-time', String(candles[999].openTime));
});

test('AC-CHART-04 second load uses candle cache', async ({ page, request }) => {
  await openChart(page); // first load: full window from the provider
  const eth = page.waitForResponse((r) => KLINES.test(r.url()) && r.url().includes('symbol=ETHUSDT'));
  await page.getByTestId('market-row-ETHUSDT').click();
  await eth;
  const btcAgain = page.waitForResponse((r) => KLINES.test(r.url()) && r.url().includes('symbol=BTCUSDT'));
  await page.getByTestId('market-row-BTCUSDT').click();
  await btcAgain;
  await expect(page.getByTestId('chart-root')).toHaveAttribute('data-candle-count', '1000');

  const stats = (await (await request.get('/api/v1/test/market/stats')).json()).data as {
    restCalls: { klines: { symbol: string; interval: string; limit: number }[] };
  };
  const btc = stats.restCalls.klines.filter((k) => k.symbol === 'BTCUSDT' && k.interval === '1h');
  expect(btc).toHaveLength(2);
  expect(btc[0].limit).toBe(1000); // empty cache → whole window
  expect(btc[1].limit).toBeLessThanOrEqual(2); // everything else came from the DB cache
});

test('AC-CHART-05 legend shows hovered candle', async ({ page, request }) => {
  await openChart(page);
  const all = ((await (await request.get('/api/v1/market/klines?symbol=BTCUSDT&interval=1h&limit=1000')).json()) as { data: Candle[] }).data;
  const legend = page.getByTestId('chart-legend');
  const root = page.getByTestId('chart-root');
  const box = (await root.boundingBox())!;

  // Pointer away → latest candle.
  await expect(legend).toHaveAttribute('data-hovered', 'false');
  await expect(legend).toHaveAttribute('data-time', String(all[999].openTime));

  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
  await expect(legend).toHaveAttribute('data-hovered', 'true');
  const time = Number(await legend.getAttribute('data-time'));
  const candle = all.find((c) => c.openTime === time)!;
  expect(candle).toBeTruthy();
  expect(time).not.toBe(all[999].openTime);

  // Time and O/H/L/C in locale (vi) format.
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(time)
      .map((p) => [p.type, p.value]),
  );
  await expect(page.getByTestId('legend-time')).toHaveText(`${parts.day}/${parts.month}/${parts.year} ${parts.hour}:${parts.minute}`);
  await expect(page.getByTestId('legend-open')).toHaveText(viPrice(candle.open));
  await expect(page.getByTestId('legend-high')).toHaveText(viPrice(candle.high));
  await expect(page.getByTestId('legend-low')).toHaveText(viPrice(candle.low));
  await expect(page.getByTestId('legend-close')).toHaveText(viPrice(candle.close));

  // Mouse out → back to the latest candle.
  await page.mouse.move(2, 2);
  await expect(legend).toHaveAttribute('data-hovered', 'false');
  await expect(legend).toHaveAttribute('data-time', String(all[999].openTime));
  await expect(page.getByTestId('legend-close')).toHaveText(viPrice(all[999].close));
});

/** "dd/MM/yyyy HH:mm" in the given timezone, built independently of the app code. */
const viTime = (ms: number, timeZone: string) => {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(ms)
      .map((x) => [x.type, x.value]),
  );
  return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}`;
};

test('AC-CHART-06 times shown in user timezone', async ({ page }) => {
  const candles = await openChart(page);
  const last = candles[candles.length - 1].openTime;
  // Guest = Asia/Ho_Chi_Minh (UTC+7): the legend of the latest candle shows its open time in that timezone.
  await expect(page.getByTestId('legend-time')).toHaveText(viTime(last, 'Asia/Ho_Chi_Minh'));
  await expect(page.getByTestId('chart-root')).toHaveAttribute('data-timezone', 'Asia/Ho_Chi_Minh'); // time axis uses the same zone
  expect(viTime(last, 'Asia/Ho_Chi_Minh')).not.toBe(viTime(last, 'UTC')); // the check can tell the zones apart
});

type FullTicker = { symbol: string; lastPrice: number; openPrice: number; highPrice: number; lowPrice: number; volume: number; quoteVolume: number };
const getTicker = async (request: import('@playwright/test').APIRequestContext, symbol: string) =>
  ((await (await request.get('/api/v1/market/tickers')).json()).data as FullTicker[]).find((t) => t.symbol === symbol)!;
const viCompact = (v: number) => new Intl.NumberFormat('vi-VN', { notation: 'compact', maximumFractionDigits: 1 }).format(v);
const signed = (v: number, d = 2) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${viPrice(Math.abs(v), d)}`;

test('AC-CHART-09 chart header shows coin name and 24h stats', async ({ page, request }) => {
  await openChart(page);
  const tk = await getTicker(request, 'BTCUSDT');

  // Avatar (first letter), pair, full name, 24 px last price, all stats in locale number format.
  await expect(page.getByTestId('chart-avatar')).toHaveText('B');
  await expect(page.getByTestId('chart-symbol')).toHaveText('BTC/USDT');
  await expect(page.getByTestId('chart-name')).toHaveText('Bitcoin');
  await expect(page.getByTestId('chart-price')).toHaveText(viPrice(tk.lastPrice));
  await expect(page.getByTestId('chart-price')).toHaveCSS('font-size', '24px');
  await expect(page.getByTestId('chart-change-abs')).toHaveText(signed(tk.lastPrice - tk.openPrice));
  await expect(page.getByTestId('chart-change')).toHaveText(/^[+−]\d+,\d{2}%$/);
  await expect(page.getByTestId('chart-high')).toHaveText(viPrice(tk.highPrice));
  await expect(page.getByTestId('chart-low')).toHaveText(viPrice(tk.lowPrice));
  await expect(page.getByTestId('chart-vol-base')).toHaveText(viPrice(tk.volume));
  await expect(page.getByTestId('chart-vol-quote')).toHaveText(viCompact(tk.quoteVolume));

  // A pair outside the static name map shows no name (the mock has no such USDT pair, so check the map's other side:
  // a mapped pair shows its name).
  await page.goto('/trade/ADAUSDT');
  await expect(page.getByTestId('chart-name')).toHaveText('Cardano');
  await expect(page.getByTestId('chart-avatar')).toHaveText('A');

  // A tick above the 24h high updates High (and the last price) within 2 s.
  await page.goto('/trade/BTCUSDT');
  await expect(page.getByTestId('chart-high')).toHaveText(viPrice(tk.highPrice));
  await expect(page.getByTestId('market-list')).toHaveAttribute('data-live', 'true'); // tickers subscription acknowledged
  const price = Math.round((tk.highPrice + 500) * 100) / 100;
  const deadline = Date.now() + 2_000;
  await pushTick(request, 'BTCUSDT', price);
  await expect(page.getByTestId('chart-high')).toHaveText(viPrice(price), { timeout: left(deadline) });
  await expect(page.getByTestId('chart-price')).toHaveText(viPrice(price), { timeout: left(deadline) });
});

test('AC-CHART-07 chart type menu switches the price series', async ({ page, request }) => {
  const candles = await openChart(page);
  const root = page.getByTestId('chart-root');
  const lastClose = String(candles.at(-1)!.close);
  const up = await cssVar(page, '--color-up');
  const down = await cssVar(page, '--color-down');
  const accent = await cssVar(page, '--color-accent');

  // Default Candles, drawn with the up/down tokens.
  await expect(root).toHaveAttribute('data-chart-type', 'candles');
  await expect(root).toHaveAttribute('data-series-color', up);
  await expect(root).toHaveAttribute('data-series-down-color', down);
  await expect(page.getByTestId('chart-type-menu')).toHaveText('Nến');

  // Translated menu with the four types.
  await page.getByTestId('chart-type-menu').click();
  await expect(page.getByRole('menuitemradio')).toHaveText(['Nến', 'Thanh OHLC', 'Đường', 'Vùng']);

  // Bars (OHLC): up/down colors.
  await page.getByTestId('chart-type-bars').click();
  await expect(root).toHaveAttribute('data-chart-type', 'bars');
  await expect(root).toHaveAttribute('data-series-color', up);
  await expect(root).toHaveAttribute('data-series-down-color', down);
  await expect(root).toHaveAttribute('data-series-last-value', lastClose);

  // Line: close prices in the accent color; indicators, legend and live updates keep working.
  await page.getByTestId('chart-type-menu').click();
  await page.getByTestId('chart-type-line').click();
  await expect(root).toHaveAttribute('data-chart-type', 'line');
  await expect(root).toHaveAttribute('data-series-color', accent);
  await expect(root).toHaveAttribute('data-series-last-value', lastClose);
  await expect(root).toHaveAttribute('data-ma-series', '7,25,99');
  await expect(page.getByTestId('chart-legend')).toBeVisible();
  await expect(page.getByTestId('legend-ma-1-value')).not.toHaveText('—');
  await expect(root).toHaveAttribute('data-live', 'BTCUSDT:1h'); // kline subscription acknowledged
  const price = Math.round((candles.at(-1)!.close + 77) * 100) / 100;
  const deadline = Date.now() + 2_000;
  await pushTick(request, 'BTCUSDT', price);
  await expect(root).toHaveAttribute('data-series-last-value', String(price), { timeout: left(deadline) });
  await expect(root).toHaveAttribute('data-last-close', String(price));

  // Timeframe switching keeps the type and shows the new timeframe's close prices.
  await page.getByTestId('tf-15m').click();
  await expect(page).toHaveURL(/tf=15m/);
  await expect(root).toHaveAttribute('data-chart-type', 'line');
  await expect(root).toHaveAttribute('data-candle-count', '1000');
  await expect.poll(async () => (await root.getAttribute('data-series-last-value')) === (await root.getAttribute('data-last-close'))).toBe(true);

  // Reload → still Line (localStorage crypto-alert.chart-type).
  expect(await page.evaluate(() => localStorage.getItem('crypto-alert.chart-type'))).toBe('line');
  await page.reload();
  await expect(root).toHaveAttribute('data-candle-count', '1000');
  await expect(root).toHaveAttribute('data-chart-type', 'line');
  await expect(page.getByTestId('chart-type-menu')).toHaveText('Đường');

  // Area: accent too; back to candles: up/down colors again.
  await page.getByTestId('chart-type-menu').click();
  await page.getByTestId('chart-type-area').click();
  await expect(root).toHaveAttribute('data-chart-type', 'area');
  await expect(root).toHaveAttribute('data-series-color', accent);
  await page.getByTestId('chart-type-menu').click();
  await page.getByTestId('chart-type-candles').click();
  await expect(root).toHaveAttribute('data-chart-type', 'candles');
  await expect(root).toHaveAttribute('data-series-color', up);
});

test('AC-CHART-08 volume bars overlay on the price pane', async ({ page, request }) => {
  await pinOpenCandle(request, 'BTCUSDT');
  const candles = await openLiveChart(page, '/trade/BTCUSDT', 'BTCUSDT:1h');
  const root = page.getByTestId('chart-root');
  const upVol = await cssVar(page, '--color-up-volume');
  const downVol = await cssVar(page, '--color-down-volume');
  const last = candles.at(-1) as Candle & { volume: number };
  const vol = (c: unknown) => (c as { volume: number }).volume;
  const colorOf = (c: Candle) => (c.close >= c.open ? upVol : downVol);

  // On by default: one bar per candle on the price pane's lowest ~20 %, colored by the candle's direction.
  await expect(root).toHaveAttribute('data-volume-count', String(candles.length));
  await expect(root).toHaveAttribute('data-volume-scale-top', '0.8');
  await expect(root).toHaveAttribute('data-panes', '1');
  await expect(root).toHaveAttribute('data-volume-up-color', upVol);
  await expect(root).toHaveAttribute('data-volume-down-color', downVol);
  await expect(root).toHaveAttribute('data-volume-last-color', colorOf(last));
  await expect(root).toHaveAttribute('data-volume-last-value', String(vol(last)));

  // Legend: `Vol` with the latest candle's base volume (compact locale format), and the hovered candle's when hovering.
  const viCompact = (v: number) => new Intl.NumberFormat('vi-VN', { notation: 'compact', maximumFractionDigits: 1 }).format(v);
  await expect(page.getByTestId('chart-legend')).toContainText('Vol');
  await expect(page.getByTestId('legend-volume')).toHaveText(viCompact(vol(last)));
  const target = candles[candles.length - 60];
  await hoverCandle(page, candles, target.openTime);
  await expect(page.getByTestId('legend-volume')).toHaveText(viCompact(vol(target)));
  await page.mouse.move(2, 2);

  // Live: a tick below the open candle's open flips the last bar's color; closing the candle adds a new bar (volume 0).
  const below = Math.round((last.open - 10) * 100) / 100;
  const above = Math.round((last.open + 10) * 100) / 100;
  let deadline = Date.now() + 2_000;
  await pushTick(request, 'BTCUSDT', below);
  await expect(root).toHaveAttribute('data-volume-last-color', downVol, { timeout: left(deadline) });
  deadline = Date.now() + 2_000;
  await pushTick(request, 'BTCUSDT', above);
  await expect(root).toHaveAttribute('data-volume-last-color', upVol, { timeout: left(deadline) });
  const { opened } = await closeCandle(request, 'BTCUSDT', '1h');
  deadline = Date.now() + 2_000;
  await expect(root).toHaveAttribute('data-volume-count', String(candles.length + 1), { timeout: left(deadline) });
  await expect(root).toHaveAttribute('data-volume-last-time', String(Math.floor(opened.openTime / 1000)));
  await expect(root).toHaveAttribute('data-volume-last-value', '0');

  // Toggle "Volume" off in the Indicators menu → bars and legend entry disappear; kept after reload.
  await page.getByTestId('indicators-button').click();
  await expect(page.getByTestId('ind-volume-toggle')).toBeChecked();
  await page.getByTestId('ind-volume-toggle').uncheck();
  await expect(root).toHaveAttribute('data-volume-count', '0');
  await expect(page.getByTestId('legend-volume')).toHaveCount(0);
  await page.reload();
  await expect(root).toHaveAttribute('data-candle-count', /\d+/);
  await expect(root).toHaveAttribute('data-volume-count', '0');
  await expect(page.getByTestId('legend-volume')).toHaveCount(0);
  await page.getByTestId('indicators-button').click();
  await expect(page.getByTestId('ind-volume-toggle')).not.toBeChecked();
});

const stamp = (epoch: number, timeZone: string) => {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(epoch)
      .map((x) => [x.type, x.value]),
  );
  return `${p.year}${p.month}${p.day}-${p.hour}${p.minute}`;
};

test('AC-CHART-10 screenshot download and maximize', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openChart(page, '/trade/BTCUSDT?tf=15m');
  const root = page.getByTestId('chart-root');

  // Camera → the browser downloads <SYMBOL>-<tf>-<yyyyMMdd-HHmm>.png (a real PNG).
  const before = Date.now();
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByTestId('chart-screenshot').click()]);
  const after = Date.now();
  const name = download.suggestedFilename();
  expect(name).toMatch(/^BTCUSDT-15m-\d{8}-\d{4}\.png$/);
  expect([stamp(before, 'Asia/Ho_Chi_Minh'), stamp(after, 'Asia/Ho_Chi_Minh')].map((x) => `BTCUSDT-15m-${x}.png`)).toContain(name);
  const bytes = readFileSync((await download.path())!);
  expect(bytes.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  expect(bytes.length).toBeGreaterThan(2_000);

  // Maximize → the chart panel fills the window above every other panel.
  const panel = page.getByTestId('chart-panel');
  const widths = async () => ({
    market: (await page.getByTestId('panel-market').boundingBox())!.width,
    side: (await page.getByTestId('panel-side').boundingBox())!.width,
    chart: (await page.getByTestId('panel-chart').boundingBox())!.width,
  });
  const normal = await widths();
  await expect(panel).toHaveAttribute('data-maximized', 'false');
  await page.getByTestId('chart-maximize').click();
  await expect(panel).toHaveAttribute('data-maximized', 'true');
  await expect(page.getByTestId('panel-chart')).toHaveAttribute('data-maximized', 'true');
  const box = (await panel.boundingBox())!;
  expect([Math.round(box.x), Math.round(box.y), Math.round(box.width), Math.round(box.height)]).toEqual([0, 0, 1440, 900]);
  // On top: the topmost element at the header's position and at a side panel's position belongs to the chart panel.
  for (const [x, y] of [[100, 20], [30, 450], [1400, 450]]) {
    expect(await page.evaluate(([px, py]) => document.elementFromPoint(px, py)?.closest('[data-testid="chart-panel"]') !== null, [x, y])).toBe(true);
  }
  // The chart redraws to the new size.
  await expect.poll(async () => Number(await root.getAttribute('data-canvas-width'))).toBe(1440);

  // Esc restores; column widths are unchanged.
  await page.keyboard.press('Escape');
  await expect(panel).toHaveAttribute('data-maximized', 'false');
  await expect.poll(async () => JSON.stringify(await widths())).toBe(JSON.stringify(normal));

  // The button toggles too.
  await page.getByTestId('chart-maximize').click();
  await expect(panel).toHaveAttribute('data-maximized', 'true');
  await page.getByTestId('chart-maximize').click();
  await expect(panel).toHaveAttribute('data-maximized', 'false');
  expect(await widths()).toEqual(normal);
});
