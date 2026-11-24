import { test, expect } from '@playwright/test';
import { DEMO, loginViaUi, registerViaUi } from '../helpers/auth';
import { left, pushTick, viPrice } from '../helpers/market';
import { resetApp } from '../helpers/reset';
import { clickStar, fillWatchlist, panelSymbols } from '../helpers/watchlist';

test.beforeEach(async ({ request }) => resetApp(request));

test('AC-WL-01 star adds pair to watchlist', async ({ page }) => {
  await registerViaUi(page); // brand-new user → empty watchlist
  await expect(page.getByTestId('user-menu')).toBeVisible();
  await expect(page.getByTestId('watchlist-empty')).toBeVisible();

  // Star on the market row.
  await expect(page.getByTestId('star-ETHUSDT')).toHaveAttribute('aria-pressed', 'false');
  await clickStar(page, 'star-ETHUSDT', 'PUT');
  await expect(page.getByTestId('star-ETHUSDT')).toHaveAttribute('aria-pressed', 'true');
  const eth = page.getByTestId('watchlist-row-ETHUSDT');
  await expect(eth).toBeVisible();
  await expect(page.getByTestId('watchlist-price-ETHUSDT')).toHaveText('3.510,25');
  await expect(page.getByTestId('watchlist-change-ETHUSDT')).toHaveText('+3,24%');

  // Star in the chart header (BTCUSDT is open) → appended at the end.
  await expect(page.getByTestId('chart-star-BTCUSDT')).toHaveAttribute('aria-pressed', 'false');
  await clickStar(page, 'chart-star-BTCUSDT', 'PUT');
  await expect(page.getByTestId('chart-star-BTCUSDT')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('star-BTCUSDT')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('watchlist-row-BTCUSDT')).toBeVisible();
  expect(await panelSymbols(page)).toEqual(['ETHUSDT', 'BTCUSDT']);
});

test('AC-WL-02 remove from watchlist', async ({ page }) => {
  await loginViaUi(page); // demo: BTCUSDT, ETHUSDT, SOLUSDT
  await expect(page.getByTestId('watchlist-row-SOLUSDT')).toBeVisible();
  await expect(page.getByTestId('star-ETHUSDT')).toHaveAttribute('aria-pressed', 'true');

  // Click the filled star.
  await clickStar(page, 'star-ETHUSDT', 'DELETE');
  await expect(page.getByTestId('watchlist-row-ETHUSDT')).toHaveCount(0);
  await expect(page.getByTestId('star-ETHUSDT')).toHaveAttribute('aria-pressed', 'false');

  // Click the × button.
  await clickStar(page, 'watchlist-remove-SOLUSDT', 'DELETE');
  await expect(page.getByTestId('watchlist-row-SOLUSDT')).toHaveCount(0);
  await expect(page.getByTestId('star-SOLUSDT')).toHaveAttribute('aria-pressed', 'false');
  expect(await panelSymbols(page)).toEqual(['BTCUSDT']);
});

test('AC-WL-03 watchlist persists across reload and browsers', async ({ page, browser }) => {
  await loginViaUi(page);
  await expect(page.getByTestId('watchlist-row-SOLUSDT')).toBeVisible();
  await clickStar(page, 'star-XRPUSDT', 'PUT');
  await expect(page.getByTestId('watchlist-row-XRPUSDT')).toBeVisible();

  await page.reload();
  await expect(page.getByTestId('watchlist-row-XRPUSDT')).toBeVisible();
  expect(await panelSymbols(page)).toEqual(['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT']);

  const other = await browser.newContext();
  const page2 = await other.newPage();
  await loginViaUi(page2);
  await expect(page2.getByTestId('watchlist-row-XRPUSDT')).toBeVisible();
  expect(await panelSymbols(page2)).toEqual(['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT']);
  await other.close();
});

test('AC-WL-04 watchlist prices update live', async ({ page, request }) => {
  await loginViaUi(page);
  const price = page.getByTestId('watchlist-price-ETHUSDT');
  await expect(price).toHaveText('3.510,25');
  await expect(page.getByTestId('market-list')).toHaveAttribute('data-live', 'true');

  const deadline = Date.now() + 2_000;
  await pushTick(request, 'ETHUSDT', 3600);
  await expect(price).toHaveText(viPrice(3600), { timeout: left(deadline) });
  await expect(page.getByTestId('watchlist-change-ETHUSDT')).toHaveText('+5,88%', { timeout: left(deadline) });
});

test('AC-WL-05 watchlist row opens chart', async ({ page }) => {
  await loginViaUi(page);
  await expect(page.getByTestId('chart-symbol')).toHaveText('BTC/USDT');
  await page.getByTestId('watchlist-row-SOLUSDT').getByRole('button').first().click();
  await expect(page).toHaveURL(/\/trade\/SOLUSDT\?tf=1h$/);
  await expect(page.getByTestId('chart-symbol')).toHaveText('SOL/USDT');
});

test('AC-WL-06 guest sees login prompt', async ({ page }) => {
  const writes: string[] = [];
  page.on('request', (r) => {
    if (/\/api\/v1\/watchlist/.test(r.url())) writes.push(`${r.method()} ${r.url()}`);
  });
  await page.goto('/trade/BTCUSDT');
  await expect(page.getByTestId('market-row-ETHUSDT')).toBeVisible();
  await page.getByTestId('star-ETHUSDT').click();
  await expect(page.getByTestId('watchlist-login-prompt')).toContainText('Đăng nhập để sử dụng danh sách theo dõi');
  await expect(page.getByTestId('watchlist-login-button')).toBeVisible();
  await expect(page.getByTestId('star-ETHUSDT')).toHaveAttribute('aria-pressed', 'false');
  expect(writes).toEqual([]);

  await page.getByTestId('watchlist-login-button').click();
  await expect(page).toHaveURL(/\/login$/);
  // Nothing was saved: after logging in as a new user the list is empty.
  await page.goto('/register');
  await registerViaUi(page);
  await expect(page.getByTestId('watchlist-empty')).toBeVisible();
});

test('AC-WL-07 isolation, no duplicates, limit 50', async ({ page, request, browser }) => {
  // Duplicate PUT keeps one row (API), seen from the UI as one row.
  const login = await request.post('/api/v1/auth/login', { data: { email: DEMO.email, password: DEMO.password } });
  const token = ((await login.json()) as { data: { accessToken: string } }).data.accessToken;
  const auth = { Authorization: `Bearer ${token}` };
  expect((await request.put('/api/v1/watchlist/ETHUSDT', { headers: auth })).ok()).toBe(true);
  expect((await request.put('/api/v1/watchlist/ETHUSDT', { headers: auth })).ok()).toBe(true);

  // User B does not see user A's watchlist.
  const ctxB = await browser.newContext();
  const pageB = await ctxB.newPage();
  await registerViaUi(pageB);
  await expect(pageB.getByTestId('watchlist-empty')).toBeVisible();
  await expect(pageB.getByTestId('star-BTCUSDT')).toHaveAttribute('aria-pressed', 'false');
  await ctxB.close();

  // User A (demo): still one ETHUSDT row.
  await loginViaUi(page);
  await expect(page.getByTestId('watchlist-row-SOLUSDT')).toBeVisible();
  await expect(page.locator('[data-testid="watchlist-row-ETHUSDT"]')).toHaveCount(1);
  expect(await panelSymbols(page)).toEqual(['BTCUSDT', 'ETHUSDT', 'SOLUSDT']);

  // 51st item → translated WATCHLIST_LIMIT_REACHED, nothing added.
  await fillWatchlist(DEMO.email, 50);
  await page.reload();
  await expect(page.getByTestId('watchlist-row-SOLUSDT')).toBeVisible();
  await page.getByTestId('star-XRPUSDT').click();
  await expect(page.getByTestId('toast')).toHaveText('Danh sách theo dõi đã đạt tối đa 50 cặp.');
  await expect(page.getByTestId('star-XRPUSDT')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByTestId('watchlist-row-XRPUSDT')).toHaveCount(0);
});
