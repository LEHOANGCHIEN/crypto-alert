import { test, expect, type Page } from '@playwright/test';
import { resetApp } from '../helpers/reset';

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
