import { test, expect, type Page } from '@playwright/test';
import { resetApp } from '../../helpers/reset';
import { lastPrice, left, pushTick } from '../../helpers/market';
import { apiCreateAlert, apiNotifications, apiSession, round } from '../../helpers/alerts';

test.beforeEach(async ({ request }) => resetApp(request));

const items = (page: Page) => page.getByTestId('notifications-page-list').locator('[data-testid^="notification-item-"]');

test('AC-NOTIF-06 notifications page', async ({ page, request }) => {
  await page.setViewportSize({ width: 1440, height: 900 });

  // The list request of the app asks for the API maximum (limit=100).
  const listRequests: string[] = [];
  page.on('request', (r) => {
    if (r.method() === 'GET' && /\/api\/v1\/notifications(\?|$)/.test(r.url())) listRequests.push(r.url());
  });

  // --- Guest: protected → /login, back to /notifications after login. ---
  await page.goto('/notifications');
  await expect(page).toHaveURL(/\/login$/);
  await page.getByTestId('field-email').fill('demo@example.com');
  await page.getByTestId('field-password').fill('Demo@123456');
  await page.getByTestId('submit-login').click();
  await expect(page).toHaveURL(/\/notifications$/);
  await expect(page.getByTestId('notifications-page')).toBeVisible();
  await expect(page.getByTestId('nav-notifications')).toHaveAttribute('aria-current', 'page');

  expect(listRequests.length).toBeGreaterThan(0);
  for (const url of listRequests) expect(new URL(url).searchParams.get('limit')).toBe('100');

  // --- Seed: 1 unread (SOLUSDT). Summary, filters, row content, link to the chart. ---
  await expect(items(page)).toHaveCount(1);
  await expect(page.getByTestId('notifications-summary')).toContainText('1 chưa đọc');
  await expect(page.getByTestId('notifications-summary')).toContainText('100 thông báo gần nhất');
  await expect(page.getByTestId('notifications-filter-all')).toHaveText('Tất cả (1)');
  await expect(page.getByTestId('notifications-filter-unread')).toHaveText('Chưa đọc (1)');
  const seeded = items(page).first();
  await expect(seeded).toHaveAttribute('data-unread', 'true');
  await expect(seeded.getByTestId('notification-text')).toContainText('SOLUSDT');
  await expect(seeded.getByTestId('notification-chart-link')).toHaveAttribute('href', '/chart/SOLUSDT');

  // --- A new notification (mock trigger) appears at the top within 2 s. ---
  // The socket is recreated with the new token after login: push the tick only when the status bar shows "connected".
  await expect(page.getByTestId('status-text')).toHaveText('Đã kết nối');
  const session = apiSession(request);
  const price = await lastPrice(request, 'BTCUSDT');
  await apiCreateAlert(request, await session(), 'BTCUSDT', 'ABOVE', round(price + 100));
  const deadline = Date.now() + 2000;
  await pushTick(request, 'BTCUSDT', round(price + 200));
  await expect(items(page)).toHaveCount(2, { timeout: left(deadline) });
  const [newest] = (await apiNotifications(request, await session())).items;
  await expect(items(page).first()).toHaveAttribute('data-testid', `notification-item-${newest.id}`);
  await expect(items(page).first().getByTestId('notification-text')).toContainText('BTCUSDT');
  await expect(page.getByTestId('notifications-filter-all')).toHaveText('Tất cả (2)');

  // --- Newest first: created-at times never increase down the list. ---
  const created = await items(page).evaluateAll((els) => els.map((e) => Date.parse((e as HTMLElement).dataset.created as string)));
  expect(created).toHaveLength(2);
  expect(created[0]).toBeGreaterThanOrEqual(created[1]);

  // --- Filter Unread, click marks one read (badge −1), mark all as read. ---
  await page.getByTestId('notifications-filter-unread').click();
  await expect(items(page)).toHaveCount(2);
  await expect(page.getByTestId('bell-badge')).toHaveText('2');
  const markedOne = page.waitForResponse((r) => r.request().method() === 'POST' && /\/notifications\/\d+\/read$/.test(r.url()) && r.status() !== 401);
  await items(page).nth(1).getByTestId('notification-mark-read').click();
  expect((await markedOne).ok()).toBe(true);
  await expect(page.getByTestId('bell-badge')).toHaveText('1');
  await expect(items(page)).toHaveCount(1); // read one leaves the Unread filter
  await expect(page.getByTestId('notifications-filter-unread')).toHaveText('Chưa đọc (1)');

  const markedAll = page.waitForResponse((r) => r.request().method() === 'POST' && r.url().includes('/notifications/read-all') && r.status() !== 401);
  await page.getByTestId('notifications-page').getByTestId('notifications-mark-all').click();
  expect((await markedAll).ok()).toBe(true);
  await expect(page.getByTestId('bell-badge')).toHaveCount(0);
  await expect(page.getByTestId('notifications-page-empty')).toBeVisible();
  await page.getByTestId('notifications-filter-all').click();
  await expect(items(page)).toHaveCount(2);
  for (const unread of await items(page).evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.unread))) expect(unread).toBe('false');

  // --- Bell panel has a "View all" link to this page. ---
  await page.getByTestId('nav-chart').click();
  await expect(page).toHaveURL(/\/chart\/BTCUSDT/);
  await page.getByTestId('bell').click();
  await expect(page.getByTestId('notifications-view-all')).toHaveText('Xem tất cả thông báo');
  await page.getByTestId('notifications-view-all').click();
  await expect(page).toHaveURL(/\/notifications$/);
  await expect(page.getByTestId('notifications-panel')).toHaveCount(0);
});

