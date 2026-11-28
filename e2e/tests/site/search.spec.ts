import { test, expect } from '@playwright/test';
import { resetApp } from '../../helpers/reset';

test.beforeEach(async ({ request }) => resetApp(request));

test('AC-SITE-02 search dialog (Ctrl+K)', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const dialog = page.getByRole('dialog');
  const input = page.getByTestId('search-input');

  // Ctrl+K opens the dialog with the focus in the input; Esc closes it.
  await expect(dialog).toHaveCount(0);
  await page.keyboard.press('Control+k');
  await expect(dialog).toBeVisible();
  await expect(input).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);

  // The header button opens it too; Esc returns the focus to the trigger.
  const trigger = page.getByTestId('search-trigger');
  await trigger.click();
  await expect(dialog).toBeVisible();
  await expect(input).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();

  // Empty query and no recent pairs yet → translated hint.
  await trigger.click();
  await expect(page.getByTestId('search-hint')).toHaveText('Nhập tên coin hoặc trang để tìm kiếm. Các cặp bạn mở gần đây sẽ hiện ở đây.');

  // "eth" lists ETHUSDT first among the pairs (the mock also has ETHBTC, which is not a USDT pair).
  await input.fill('eth');
  const options = page.getByRole('option');
  await expect(options.first()).toContainText('ETH/USDT');
  await expect(options.first()).toContainText('Ethereum');
  await expect(options.first()).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByTestId('search-result-pair-ETHBTC')).toHaveCount(0);

  // Pages match on their translated label ("canh" → "Cảnh báo giá"), listed after the pairs.
  await input.fill('canh');
  await expect(page.getByTestId('search-result-page-alerts')).toHaveText('Cảnh báo giá');

  // ↑/↓ move the selection (wrapping).
  await input.fill('usdt');
  await expect(options.nth(1)).toBeVisible();
  await expect(options.nth(0)).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('ArrowDown');
  await expect(options.nth(1)).toHaveAttribute('aria-selected', 'true');
  await expect(options.nth(0)).toHaveAttribute('aria-selected', 'false');
  await page.keyboard.press('ArrowUp');
  await expect(options.nth(0)).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('ArrowUp');
  await expect(options.last()).toHaveAttribute('aria-selected', 'true');

  // Enter on a pair opens its coin page (until phase 7c) and closes the dialog.
  await input.fill('eth');
  await expect(options.first()).toContainText('ETH/USDT');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/coin\/ETHUSDT$/);
  await expect(dialog).toHaveCount(0);

  // Enter on a page: "bieu" → Supercharts (last opened symbol = ETHUSDT).
  await page.keyboard.press('Control+k');
  await input.fill('bieu');
  await expect(page.getByTestId('search-result-page-chart')).toHaveText('Siêu biểu đồ');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/chart\/ETHUSDT$/);

  // Empty query shows the recent pairs (last opened first), stored in localStorage `crypto-alert.recent-symbols`.
  await page.getByTestId('chart-pair-select').click();
  await expect(dialog).toBeVisible();
  await expect(input).toHaveValue('');
  await expect(page.getByTestId('search-result-recent-ETHUSDT')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('crypto-alert.recent-symbols'))).toBe('["ETHUSDT"]');
  await page.keyboard.press('Escape');
  await page.goto('/coin/SOLUSDT');
  await expect(page.getByTestId('coin-page')).toBeVisible();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('crypto-alert.recent-symbols'))).toBe('["SOLUSDT","ETHUSDT"]');
  await page.getByTestId('search-trigger').click();
  await expect(page.getByRole('option')).toHaveCount(2);
  await expect(page.getByRole('option').first()).toContainText('SOL/USDT');
  await expect(page.getByRole('option').nth(1)).toContainText('ETH/USDT');

  // No result → translated empty state (vi, then en).
  await input.fill('zzz');
  await expect(page.getByTestId('search-empty')).toHaveText('Không tìm thấy kết quả phù hợp.');
  await page.keyboard.press('Escape');
  await page.getByTestId('lang-en').click();
  await expect(page.getByTestId('search-trigger')).toHaveText('Search (Ctrl+K)');
  await page.getByTestId('search-trigger').click();
  await expect(input).toHaveAttribute('placeholder', 'Search coins, pairs, pages…');
  await input.fill('zzz');
  await expect(page.getByTestId('search-empty')).toHaveText('No matching results.');
  await input.fill('alert');
  await expect(page.getByTestId('search-result-page-alerts')).toHaveText('Price alerts');
});
