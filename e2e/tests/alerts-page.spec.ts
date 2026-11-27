import { test, expect, type Page } from '@playwright/test';
import { resetApp } from '../helpers/reset';
import { logoutViaUi, registerViaUi } from '../helpers/auth';
import { lastPrice } from '../helpers/market';
import { apiAlerts, apiSession, round, type Alert } from '../helpers/alerts';

test.beforeEach(async ({ request }) => resetApp(request));

const rows = (page: Page) => page.locator('[data-testid^="alerts-row-"][data-status]');

test('AC-ALERT-12 alerts page', async ({ page, request }) => {
  await page.setViewportSize({ width: 1440, height: 900 });

  // --- Guest: protected → /login, and back to /alerts after login (return-to). ---
  await page.goto('/alerts');
  await expect(page).toHaveURL(/\/login$/);
  await page.getByTestId('field-email').fill('demo@example.com');
  await page.getByTestId('field-password').fill('Demo@123456');
  await page.getByTestId('submit-login').click();
  await expect(page).toHaveURL(/\/alerts$/);
  await expect(page.getByTestId('alerts-page')).toBeVisible();

  // --- Seed: 2 active + 1 triggered. Table columns, status badges, counts, summary. ---
  const alerts = await apiAlerts(request, await apiSession(request)());
  const seededActive = alerts.filter((a) => a.status === 'ACTIVE');
  const seededTriggered = alerts.find((a) => a.status === 'TRIGGERED') as Alert;
  expect(seededActive).toHaveLength(2);

  await expect(rows(page)).toHaveCount(3);
  await expect(page.getByTestId('alerts-filter-all')).toHaveText('Tất cả (3)');
  await expect(page.getByTestId('alerts-filter-active')).toHaveText('Đang chạy (2)');
  await expect(page.getByTestId('alerts-filter-triggered')).toHaveText('Đã kích hoạt (1)');
  await expect(page.getByTestId('alerts-summary')).toContainText('2 đang chạy · 1 đã kích hoạt');
  for (const col of ['Cặp', 'Điều kiện', 'Giá mục tiêu', 'Giá hiện tại', 'Khoảng cách', 'Trạng thái', 'Tạo lúc', 'Kích hoạt lúc']) {
    await expect(page.getByTestId('alerts-table').locator('th', { hasText: col }).first()).toBeVisible();
  }
  const triggeredRow = page.getByTestId(`alerts-row-${seededTriggered.id}`);
  await expect(triggeredRow.getByTestId('alerts-row-status')).toHaveText('Đã kích hoạt');
  await expect(triggeredRow.getByTestId('alerts-row-triggered-at')).not.toHaveText('—');
  await expect(page.getByTestId(`alerts-row-${seededActive[0].id}`).getByTestId('alerts-row-status')).toHaveText('Đang chạy');

  // --- Status filter + symbol search. ---
  await page.getByTestId('alerts-filter-triggered').click();
  await expect(rows(page)).toHaveCount(1);
  await expect(rows(page).first()).toHaveAttribute('data-status', 'TRIGGERED');
  await page.getByTestId('alerts-filter-active').click();
  await expect(rows(page)).toHaveCount(2);
  await page.getByTestId('alerts-filter-all').click();
  await page.getByTestId('alerts-search').fill('eth');
  await expect(rows(page)).toHaveCount(1);
  await expect(rows(page).first().getByTestId('alerts-row-symbol')).toHaveAttribute('data-symbol', 'ETHUSDT');
  await page.getByTestId('alerts-search').fill('');
  await expect(rows(page)).toHaveCount(3);

  // --- New alert dialog: symbol validated against the market list, translated errors. ---
  await page.getByTestId('alerts-new-button').click();
  const dialog = page.getByTestId('alerts-dialog');
  await expect(dialog).toBeVisible();
  await page.getByTestId('field-dialogSymbol').fill('FAKEUSDT');
  await page.getByTestId('dialog-submit').click();
  await expect(page.getByTestId('error-dialogSymbol')).toHaveText('Không tìm thấy cặp giao dịch này.');

  // Valid symbol; target prefilled with the current price → condition already met (translated server error).
  await page.getByTestId('field-dialogSymbol').fill('ethusdt');
  await expect(page.getByTestId('error-dialogSymbol')).toHaveCount(0);
  await expect(page.getByTestId('field-dialogTarget')).not.toHaveValue('');
  await page.getByTestId('dialog-submit').click();
  await expect(page.getByTestId('dialog-error')).toHaveText('Điều kiện cảnh báo đã thỏa mãn ở giá hiện tại.');

  // Empty target → translated field error.
  await page.getByTestId('field-dialogTarget').fill('');
  await page.getByTestId('dialog-submit').click();
  await expect(page.getByTestId('error-dialogTarget')).toBeVisible();

  // Valid: Above price + 100 → created, dialog closes, new row at the top of the table.
  const target = round((await lastPrice(request, 'ETHUSDT')) + 100);
  await page.getByTestId('dialog-condition-above').click();
  await page.getByTestId('field-dialogTarget').fill(String(target));
  const created = page.waitForResponse((r) => r.url().endsWith('/api/v1/alerts') && r.request().method() === 'POST' && r.status() !== 401);
  await page.getByTestId('dialog-submit').click();
  const res = await created;
  expect(res.status()).toBe(201);
  const newAlert = ((await res.json()) as { data: Alert }).data;
  await expect(dialog).toHaveCount(0);
  await expect(page.getByTestId(`alerts-row-${newAlert.id}`)).toBeVisible();
  await expect(rows(page)).toHaveCount(4);
  await expect(page.getByTestId('alerts-filter-active')).toHaveText('Đang chạy (3)');

  // --- Delete an active alert: same rules as the Alerts tab (removed from the table); triggered ones deletable too. ---
  const deleted = page.waitForResponse((r) => r.url().endsWith(`/api/v1/alerts/${newAlert.id}`) && r.request().method() === 'DELETE' && r.status() !== 401);
  await page.getByTestId(`alerts-delete-${newAlert.id}`).click();
  expect((await deleted).status()).toBe(200);
  await expect(page.getByTestId(`alerts-row-${newAlert.id}`)).toHaveCount(0);
  await expect(rows(page)).toHaveCount(3);
  const deletedTriggered = page.waitForResponse((r) => r.url().endsWith(`/api/v1/alerts/${seededTriggered.id}`) && r.request().method() === 'DELETE' && r.status() !== 401);
  await page.getByTestId(`alerts-delete-${seededTriggered.id}`).click();
  expect((await deletedTriggered).status()).toBe(200);
  await expect(rows(page)).toHaveCount(2);

  // --- Clicking a symbol opens the chart. ---
  const first = rows(page).first().getByTestId('alerts-row-symbol');
  const symbol = (await first.getAttribute('data-symbol')) as string;
  await first.click();
  await expect(page).toHaveURL(new RegExp(`/trade/${symbol}`));

  // --- Empty state with a link to the chart (new user without alerts). ---
  await logoutViaUi(page);
  await registerViaUi(page);
  await expect(page.getByTestId('user-menu')).toBeVisible();
  await page.getByTestId('nav-alerts').click();
  await expect(page.getByTestId('alerts-page-empty')).toBeVisible();
  await page.getByTestId('alerts-empty-link').click();
  await expect(page).toHaveURL(/\/trade\/BTCUSDT/);
});
