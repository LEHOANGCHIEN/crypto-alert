import { test, expect, type Page } from '@playwright/test';
import { resetApp } from '../helpers/reset';
import { left, pushTick } from '../helpers/market';
import { loginViaUi } from '../helpers/auth';
import { cssVar } from '../helpers/chart';

test.beforeEach(async ({ request }) => resetApp(request));

const USDT = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT', 'BNBUSDT', 'DOGEUSDT', 'ADAUSDT', 'LINKUSDT'];

const rowSymbols = (page: Page) =>
  page.locator('[data-testid^="market-row-"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')!.replace('market-row-', '')));

test('AC-MKT-01 list shows only USDT pairs sorted by volume', async ({ page, request }) => {
  await page.goto('/trade/BTCUSDT');
  await expect(page.getByTestId('market-row-BTCUSDT')).toBeVisible();

  // Column header names all four columns: Pair, 24h volume (left) and Last price, 24h change (right).
  await expect(page.getByTestId('market-columns').locator('span')).toHaveText(['Cặp', 'Khối lượng 24h', 'Giá gần nhất', 'Thay đổi 24h']);

  // Two-line row: pair (base bold + muted /USDT) over the volume on the left, price over the change on the right.
  const row = page.getByTestId('market-row-ETHUSDT');
  expect(Math.round((await row.boundingBox())!.height)).toBe(48);
  await expect(row).toContainText('ETH/USDT');
  const base = page.getByTestId('market-pair-ETHUSDT');
  expect(Number(await base.evaluate((e) => getComputedStyle(e).fontWeight))).toBeGreaterThanOrEqual(600);
  const suffix = row.getByText('/USDT', { exact: true });
  const faint = await cssVar(page, '--color-text-faint');
  const toRgb = (hex: string) => `rgb(${parseInt(hex.slice(1, 3), 16)}, ${parseInt(hex.slice(3, 5), 16)}, ${parseInt(hex.slice(5, 7), 16)})`;
  await expect(suffix).toHaveCSS('color', toRgb(faint));
  const pair = (await base.boundingBox())!;
  const volume = (await page.getByTestId('market-volume-ETHUSDT').boundingBox())!;
  const price = (await page.getByTestId('market-price-ETHUSDT').boundingBox())!;
  const change = (await page.getByTestId('market-change-ETHUSDT').boundingBox())!;
  expect(pair.y + pair.height).toBeLessThanOrEqual(volume.y + 1); // pair above volume
  expect(Math.abs(pair.x - volume.x)).toBeLessThan(2); // same left edge
  expect(price.y + price.height).toBeLessThanOrEqual(change.y + 1); // price above change
  expect(price.x).toBeGreaterThan(pair.x + pair.width); // price column is right of the pair column
  const eth = ((await (await request.get('/api/v1/market/tickers')).json()).data as { symbol: string; quoteVolume: number }[]).find((t) => t.symbol === 'ETHUSDT')!;
  await expect(page.getByTestId('market-volume-ETHUSDT')).toHaveText(new Intl.NumberFormat('vi-VN', { notation: 'compact', maximumFractionDigits: 1 }).format(eth.quoteVolume));

  // Only …USDT pairs: the mock also knows ETHBTC and BTCUSDC, which must not appear.
  await expect(page.getByTestId('market-row-ETHBTC')).toHaveCount(0);
  await expect(page.getByTestId('market-row-BTCUSDC')).toHaveCount(0);
  const shown = await rowSymbols(page);
  expect([...shown].sort()).toEqual([...USDT].sort());

  // Default order = 24h quote volume descending (checked against the API).
  const tickers = (await (await request.get('/api/v1/market/tickers')).json()).data as { symbol: string; quoteVolume: number }[];
  const byVolume = [...tickers].sort((a, b) => b.quoteVolume - a.quoteVolume).map((t) => t.symbol);
  expect(shown).toEqual(byVolume);
  expect(shown[0]).toBe('BTCUSDT');

  // Cells show price with the pair's precision (vi format), compact volume.
  await expect(page.getByTestId('market-price-ETHUSDT')).toHaveText('3.510,25');
  await expect(page.getByTestId('market-price-XRPUSDT')).toHaveText('0,5234');
});

test('AC-MKT-07 market list has All and Watchlist tabs', async ({ page, browser }) => {
  // Demo user watches BTCUSDT, ETHUSDT, SOLUSDT; remove SOLUSDT so exactly BTCUSDT and ETHUSDT remain.
  await loginViaUi(page);
  await page.goto('/trade/BTCUSDT');
  await expect(page.getByTestId('market-row-SOLUSDT')).toBeVisible();
  await expect(page.getByTestId('market-tab-all')).toHaveAttribute('aria-selected', 'true');
  const removed = page.waitForResponse((r) => r.request().method() === 'DELETE' && r.url().includes('/watchlist/SOLUSDT') && r.status() !== 401);
  await page.getByTestId('star-SOLUSDT').click();
  expect((await removed).ok()).toBe(true);

  await page.getByTestId('market-tab-watchlist').click();
  await expect(page.getByTestId('market-tab-watchlist')).toHaveAttribute('aria-selected', 'true');
  await expect.poll(() => rowSymbols(page)).toEqual(['BTCUSDT', 'ETHUSDT']);

  // Search still filters inside the tab.
  await page.getByTestId('market-search').fill('eth');
  await expect.poll(() => rowSymbols(page)).toEqual(['ETHUSDT']);
  await page.getByTestId('market-search').fill('sol');
  await expect(page.getByTestId('market-empty')).toBeVisible();
  await page.getByTestId('market-search').fill('');

  // All → the full list again.
  await page.getByTestId('market-tab-all').click();
  await expect.poll(async () => (await rowSymbols(page)).length).toBe(USDT.length);

  // Guest: Watchlist tab shows a translated login prompt with a link to /login.
  const guest = await (await browser.newContext({ baseURL: page.url().split('/trade')[0] })).newPage();
  await guest.goto('/trade/BTCUSDT');
  await expect(guest.getByTestId('market-row-BTCUSDT')).toBeVisible();
  await guest.getByTestId('market-tab-watchlist').click();
  const prompt = guest.getByTestId('market-tab-login-prompt');
  await expect(prompt).toContainText('Đăng nhập để xem danh sách theo dõi của bạn.');
  await expect(prompt.getByRole('link', { name: 'Đăng nhập' })).toHaveAttribute('href', '/login');
  await prompt.getByRole('link', { name: 'Đăng nhập' }).click();
  await expect(guest).toHaveURL(/\/login$/);
  await guest.context().close();
});

test('AC-MKT-02 search filters pairs', async ({ page }) => {
  await page.goto('/trade/BTCUSDT');
  await expect(page.getByTestId('market-row-BTCUSDT')).toBeVisible();

  await page.getByTestId('market-search').fill('eth');
  await expect(page.getByTestId('market-row-ETHUSDT')).toBeVisible();
  expect(await rowSymbols(page)).toEqual(['ETHUSDT']);

  await page.getByTestId('market-search').fill('zzz');
  await expect(page.getByTestId('market-empty')).toHaveText('Không tìm thấy cặp giao dịch nào.');
  await expect(page.locator('[data-testid^="market-row-"]')).toHaveCount(0);

  await page.getByTestId('market-search').fill('');
  await expect(page.getByTestId('market-row-BTCUSDT')).toBeVisible();
  expect((await rowSymbols(page)).length).toBe(USDT.length);
});

test('AC-MKT-04 change colors and signs', async ({ page }) => {
  await page.goto('/trade/BTCUSDT');
  // Mock data: ETH up (+3.24 %), SOL down (−5.10 %), XRP unchanged (0.00 %).
  const up = page.getByTestId('market-change-ETHUSDT');
  const down = page.getByTestId('market-change-SOLUSDT');
  const flat = page.getByTestId('market-change-XRPUSDT');
  await expect(up).toHaveText('+3,24%');
  await expect(up).toHaveClass(/text-up/);
  await expect(down).toHaveText('−5,10%');
  await expect(down).toHaveClass(/text-down/);
  await expect(flat).toHaveText('0,00%');
  await expect(flat).not.toHaveClass(/text-up|text-down/);
  await expect(flat).toHaveClass(/text-text-muted/);
});

test('AC-MKT-05 row click opens chart', async ({ page }) => {
  // Without ?tf= the current timeframe (default 1h) is written into the URL.
  await page.goto('/trade/BTCUSDT');
  await expect(page.getByTestId('market-row-BTCUSDT')).toHaveAttribute('aria-selected', 'true');
  await page.getByTestId('market-row-ETHUSDT').click();
  await expect(page).toHaveURL(/\/trade\/ETHUSDT\?tf=1h$/);

  await page.goto('/trade/BTCUSDT?tf=15m');
  await expect(page.getByTestId('market-row-BTCUSDT')).toHaveAttribute('aria-selected', 'true');

  await page.getByTestId('market-row-ETHUSDT').click();
  await expect(page).toHaveURL(/\/trade\/ETHUSDT\?tf=15m$/);
  await expect(page.getByTestId('market-row-ETHUSDT')).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByTestId('market-row-BTCUSDT')).toHaveAttribute('aria-selected', 'false');

  // Chart and header switch to ETHUSDT (15m stays selected).
  await expect(page.getByTestId('chart-symbol')).toHaveText('ETH/USDT');
  await expect(page.getByTestId('chart-price')).toHaveText('3.510,25');
  await expect(page.getByTestId('chart-root')).toHaveAttribute('data-candle-count', '1000');
  await expect(page.getByTestId('tf-15m')).toHaveAttribute('aria-pressed', 'true');
});

test('AC-MKT-06 unknown pair shows not found', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/trade/FAKEUSDT');

  await expect(page.getByTestId('chart-not-found')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Không tìm thấy cặp giao dịch' })).toBeVisible();
  await expect(page.getByTestId('chart-root')).toHaveCount(0);
  // The app keeps working: the market list is still there and the link goes to BTCUSDT.
  await expect(page.getByTestId('market-row-BTCUSDT')).toBeVisible();
  await page.getByTestId('chart-not-found-link').click();
  await expect(page).toHaveURL(/\/trade\/BTCUSDT$/);
  await expect(page.getByTestId('chart-root')).toBeVisible();
  expect(errors).toEqual([]);
});

test('AC-MKT-03 live ticker updates row', async ({ page, request }) => {
  await page.goto('/trade/BTCUSDT');
  const price = page.getByTestId('market-price-ETHUSDT');
  await expect(price).toHaveText('3.510,25');
  // Wait until the page is subscribed to live tickers, so the push below cannot be missed.
  await expect(page.getByTestId('market-list')).toHaveAttribute('data-live', 'true');

  // Up: ETHUSDT 24h open is 3400 in the mock → change = (3600 − 3400) / 3400 = +5.88 %.
  let deadline = Date.now() + 2_000;
  await pushTick(request, 'ETHUSDT', 3600, 500_000_000);
  await expect(price).toHaveText('3.600,00', { timeout: left(deadline) });
  await expect(page.getByTestId('market-change-ETHUSDT')).toHaveText('+5,88%', { timeout: left(deadline) });
  await expect(page.getByTestId('market-volume-ETHUSDT')).toHaveText(
    new Intl.NumberFormat('vi-VN', { notation: 'compact', maximumFractionDigits: 1 }).format(500_000_000),
    { timeout: left(deadline) },
  );
  await expect(price).toHaveAttribute('data-flash', 'up', { timeout: left(deadline) });
  await expect(price).toHaveClass(/bg-up-soft/);

  // Down: lower price → red flash, change recomputed (+2.94 %).
  deadline = Date.now() + 2_000;
  await pushTick(request, 'ETHUSDT', 3500);
  await expect(price).toHaveText('3.500,00', { timeout: left(deadline) });
  await expect(page.getByTestId('market-change-ETHUSDT')).toHaveText('+2,94%', { timeout: left(deadline) });
  await expect(price).toHaveAttribute('data-flash', 'down', { timeout: left(deadline) });
  await expect(price).toHaveClass(/bg-down-soft/);
  // The flash is brief: it goes away by itself.
  await expect(price).not.toHaveAttribute('data-flash', /.+/);
});
