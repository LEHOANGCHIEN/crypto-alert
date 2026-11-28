import { test, expect, type APIRequestContext } from '@playwright/test';
import { resetApp } from '../../helpers/reset';
import { loginViaUi } from '../../helpers/auth';
import { left, pushTick, viPrice, type Candle, type Ticker } from '../../helpers/market';

test.beforeEach(async ({ request }) => resetApp(request));

const SUMMARY = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT'];
const NAMES: Record<string, string> = { BTCUSDT: 'Bitcoin', ETHUSDT: 'Ethereum', BNBUSDT: 'BNB', SOLUSDT: 'Solana' };

const api = async <T>(request: APIRequestContext, path: string): Promise<T> =>
  ((await (await request.get(`/api/v1${path}`)).json()) as { data: T }).data;

const viPercent = (v: number): string => {
  const abs = Math.abs(v).toFixed(2).replace('.', ',');
  return abs === '0,00' ? '0,00%' : `${v > 0 ? '+' : '−'}${abs}%`;
};
const direction = (v: number): 'up' | 'down' | 'flat' => (Number(Math.abs(v).toFixed(2)) === 0 ? 'flat' : v > 0 ? 'up' : 'down');
const colorClass = { up: /text-up/, down: /text-down/, flat: /text-text-muted/ } as const;

test('AC-SITE-01 home shows hero, market summary and movers', async ({ page, request }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const klineRequests: string[] = [];
  page.on('request', (r) => {
    if (/\/api\/v1\/market\/klines\?/.test(r.url())) klineRequests.push(r.url());
  });

  const tickers = await api<Ticker[]>(request, '/market/tickers');
  const symbols = await api<{ symbol: string; pricePrecision: number }[]>(request, '/market/symbols');
  const precision = (s: string) => symbols.find((x) => x.symbol === s)!.pricePrecision;

  await page.goto('/');
  await expect(page.getByTestId('page-home')).toBeVisible();

  // Hero: translated headline + subline, large search field, "Open Supercharts" → /chart/BTCUSDT.
  await expect(page.getByTestId('home-title')).toHaveText('Nhìn rõ thị trường trước khi quyết định');
  await expect(page.getByTestId('home-hero')).toContainText('Giá thời gian thực, biểu đồ kỹ thuật');
  await expect(page.getByTestId('home-search')).toBeVisible();
  await expect(page.getByTestId('home-open-chart')).toHaveText('Mở siêu biểu đồ');
  await expect(page.getByTestId('home-open-chart')).toHaveAttribute('href', '/chart/BTCUSDT');

  // Market summary: cards for BTC, ETH, BNB, SOL in this order, with avatar-less name, pair, price, change, sparkline.
  const cards = page.locator('[data-testid^="summary-card-"]');
  await expect(cards).toHaveCount(4);
  expect(await cards.evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')))).toEqual(SUMMARY.map((s) => `summary-card-${s}`));
  for (const s of SUMMARY) {
    const t = tickers.find((x) => x.symbol === s)!;
    const card = page.getByTestId(`summary-card-${s}`);
    await expect(page.getByTestId(`summary-name-${s}`)).toHaveText(NAMES[s]!);
    await expect(card).toContainText(s);
    await expect(page.getByTestId(`summary-price-${s}`)).toHaveText(viPrice(t.lastPrice, precision(s)));
    await expect(page.getByTestId(`summary-change-${s}`)).toHaveText(viPercent(t.priceChangePercent));
    await expect(page.getByTestId(`summary-change-${s}`)).toHaveClass(colorClass[direction(t.priceChangePercent)]);
    await expect(card).toHaveAttribute('href', `/coin/${s}`);

    // Sparkline: 24 hourly candles, colored by its own change (last close vs first close of those candles).
    const candles = await api<Candle[]>(request, `/market/klines?symbol=${s}&interval=1h&limit=24`);
    const own = ((candles.at(-1)!.close - candles[0]!.close) / candles[0]!.close) * 100;
    await expect(page.getByTestId(`summary-spark-${s}`)).toHaveAttribute('data-points', '24');
    await expect(page.getByTestId(`summary-spark-${s}`)).toHaveAttribute('data-direction', direction(own));
    // One klines request per card: interval 1h, limit 24.
    const mine = klineRequests.filter((u) => new URL(u).searchParams.get('symbol') === s && new URL(u).searchParams.get('limit') === '24');
    expect(mine.length, s).toBe(1);
    expect(new URL(mine[0]!).searchParams.get('interval')).toBe('1h');
  }

  // Movers: Gainers (default) = top 6 by 24h change % descending; Losers = ascending; rows link to /coin/<SYMBOL>.
  const order = (kind: 'gainers' | 'losers') =>
    tickers
      .map((t, i) => ({ t, i }))
      .sort((a, b) => (kind === 'gainers' ? -1 : 1) * (a.t.priceChangePercent - b.t.priceChangePercent) || a.i - b.i)
      .slice(0, 6)
      .map((x) => x.t);
  const rows = page.locator('[data-testid^="mover-row-"]');
  await expect(page.getByTestId('movers-tab-gainers')).toHaveAttribute('aria-selected', 'true');
  await expect(rows).toHaveCount(6);
  expect(await rows.evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')))).toEqual(order('gainers').map((t) => `mover-row-${t.symbol}`));
  await page.getByTestId('movers-tab-losers').click();
  await expect(page.getByTestId('movers-tab-losers')).toHaveAttribute('aria-selected', 'true');
  await expect(rows.first()).toHaveAttribute('data-testid', `mover-row-${order('losers')[0]!.symbol}`);
  expect(await rows.evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')))).toEqual(order('losers').map((t) => `mover-row-${t.symbol}`));
  for (const t of order('losers')) {
    await expect(page.getByTestId(`mover-row-${t.symbol}`)).toHaveAttribute('href', `/coin/${t.symbol}`);
    await expect(page.getByTestId(`mover-change-${t.symbol}`)).toHaveText(viPercent(t.priceChangePercent));
  }

  // No placeholder or sample data from the mockup anywhere on the page.
  const text = (await page.getByTestId('page-home').innerText()).toLowerCase();
  for (const sample of ['lorem', 'minhtrader', 'cointelegraph', 'zecusdt', 'fetusdt', '59.933']) expect(text).not.toContain(sample);

  // A mock tick on ETHUSDT updates its card price within 2 s (wait for the live subscription first).
  await expect(page.getByTestId('page-home')).toHaveAttribute('data-live', 'true');
  const price = (tickers.find((x) => x.symbol === 'ETHUSDT')!.lastPrice * 1.07);
  const deadline = Date.now() + 2000;
  await pushTick(request, 'ETHUSDT', price);
  await expect(page.getByTestId('summary-price-ETHUSDT')).toHaveText(viPrice(price, precision('ETHUSDT')), { timeout: left(deadline) });

  // The search field opens the search dialog with the typed text.
  await page.getByTestId('home-search').fill('eth');
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByTestId('search-input')).toHaveValue('eth');
  await expect(page.getByRole('option').first()).toContainText('ETH/USDT');
  await page.keyboard.press('Escape');

  // English: translated tabs and headline.
  await page.getByTestId('lang-en').click();
  await expect(page.getByTestId('home-title')).toHaveText('See the market clearly before you decide');
  await expect(page.getByTestId('movers-tab-gainers')).toHaveText('Gainers');
  await expect(page.getByTestId('movers-tab-losers')).toHaveText('Losers');
  await expect(page.getByTestId('home-open-chart')).toHaveText('Open Supercharts');

  // A logged-in user sees the same sections; on a phone (390×844) the page is one column without horizontal scroll.
  await loginViaUi(page);
  await page.goto('/');
  await expect(page.getByTestId('summary-card-BTCUSDT')).toBeVisible();
  await expect(rows).toHaveCount(6);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByTestId('summary-card-SOLUSDT')).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
});
