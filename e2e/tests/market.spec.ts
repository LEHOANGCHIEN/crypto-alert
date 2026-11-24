import { test, expect, type Page } from '@playwright/test';
import { resetApp } from '../helpers/reset';
import { left, pushTick } from '../helpers/market';

test.beforeEach(async ({ request }) => resetApp(request));

const USDT = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT', 'BNBUSDT', 'DOGEUSDT', 'ADAUSDT', 'LINKUSDT'];

const rowSymbols = (page: Page) =>
  page.locator('[data-testid^="market-row-"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')!.replace('market-row-', '')));

test('AC-MKT-01 list shows only USDT pairs sorted by volume', async ({ page, request }) => {
  await page.goto('/trade/BTCUSDT');
  await expect(page.getByTestId('market-row-BTCUSDT')).toBeVisible();

  // Columns: Pair, Last price, 24h change, 24h volume.
  await expect(page.getByTestId('market-columns').locator('span')).toHaveText(['Cặp', 'Giá gần nhất', 'Thay đổi 24h', 'Khối lượng 24h']);

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
  await expect(price).toHaveClass(/bg-up\/20/);

  // Down: lower price → red flash, change recomputed (+2.94 %).
  deadline = Date.now() + 2_000;
  await pushTick(request, 'ETHUSDT', 3500);
  await expect(price).toHaveText('3.500,00', { timeout: left(deadline) });
  await expect(page.getByTestId('market-change-ETHUSDT')).toHaveText('+2,94%', { timeout: left(deadline) });
  await expect(price).toHaveAttribute('data-flash', 'down', { timeout: left(deadline) });
  await expect(price).toHaveClass(/bg-down\/20/);
  // The flash is brief: it goes away by itself.
  await expect(price).not.toHaveAttribute('data-flash', /.+/);
});
