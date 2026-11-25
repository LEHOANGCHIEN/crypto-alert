import { test, expect, type Page } from '@playwright/test';
import { resetApp } from '../helpers/reset';
import { loginViaUi, logoutViaUi } from '../helpers/auth';
import { lastPrice, left, pushTick, viPrice } from '../helpers/market';
import { notificationToast } from '../helpers/toast';
import { apiCreateAlert, apiMarkRead, apiSession, apiNotifications, createAlertViaUi, openAlertsTab, round, viDateTime } from '../helpers/alerts';

test.beforeEach(async ({ request }) => resetApp(request));

const viAbove = (symbol: string, target: string, now: string) => `${symbol} đã vượt lên trên ${target} (hiện tại ${now})`;
const viBelow = (symbol: string, target: string, now: string) => `${symbol} đã giảm xuống dưới ${target} (hiện tại ${now})`;
const badge = (page: Page) => page.getByTestId('bell-badge');
const item = (page: Page, id: number) => page.getByTestId(`notification-item-${id}`);

test('AC-NOTIF-01 bell unread badge', async ({ page, request }) => {
  await loginViaUi(page);
  await expect(page.locator('header').getByTestId('bell')).toBeVisible();
  await expect(badge(page)).toHaveText('1'); // seeded unread notification

  // 10 more unread → 11 → "9+".
  const token = apiSession(request);
  const price = await lastPrice(request, 'BTCUSDT');
  for (let i = 1; i <= 10; i++) await apiCreateAlert(request, await token(), 'BTCUSDT', 'ABOVE', round(price + i));
  await pushTick(request, 'BTCUSDT', round(price + 20));
  await expect.poll(async () => (await apiNotifications(request, await token())).unreadCount).toBe(11);
  await expect(badge(page)).toHaveText('9+');

  // 0 unread → badge hidden.
  await page.getByTestId('bell').click();
  await page.getByTestId('notifications-mark-all').click();
  await expect(badge(page)).toHaveCount(0);
  await expect(page.getByTestId('bell')).toBeVisible();
});

test('AC-NOTIF-02 notification list content and order', async ({ page, request }) => {
  await loginViaUi(page);
  const token = apiSession(request);
  const btc = await lastPrice(request, 'BTCUSDT');
  const eth = await lastPrice(request, 'ETHUSDT');
  const btcTarget = round(btc + 100);
  const ethTarget = round(eth - 10);
  await apiCreateAlert(request, await token(), 'BTCUSDT', 'ABOVE', btcTarget);
  await apiCreateAlert(request, await token(), 'ETHUSDT', 'BELOW', ethTarget);

  await pushTick(request, 'BTCUSDT', round(btcTarget + 1));
  await expect(badge(page)).toHaveText('2');
  await pushTick(request, 'ETHUSDT', round(ethTarget - 1));
  await expect(badge(page)).toHaveText('3');

  const { items } = await apiNotifications(request, await token());
  const [ethN, btcN, seeded] = items; // API: newest first
  expect([ethN.payload.symbol, btcN.payload.symbol, seeded.payload.symbol]).toEqual(['ETHUSDT', 'BTCUSDT', 'SOLUSDT']);
  await apiMarkRead(request, await token(), seeded.id); // one read item to compare with the unread ones
  await expect(badge(page)).toHaveText('2');

  await page.getByTestId('bell').click();
  const panel = page.getByTestId('notifications-panel');
  await expect(panel.locator('[data-testid^="notification-item-"]')).toHaveCount(3);
  await expect(panel.locator('[data-testid^="notification-item-"]').nth(0)).toHaveAttribute('data-testid', `notification-item-${ethN.id}`);
  await expect(panel.locator('[data-testid^="notification-item-"]').nth(1)).toHaveAttribute('data-testid', `notification-item-${btcN.id}`);
  await expect(panel.locator('[data-testid^="notification-item-"]').nth(2)).toHaveAttribute('data-testid', `notification-item-${seeded.id}`);

  const expectItem = async (id: number, text: string, symbol: string, condition: string, target: string, now: string, createdAt: string, unread: boolean) => {
    const it = item(page, id);
    await expect(it.getByTestId('notification-text')).toHaveText(text);
    await expect(it.getByTestId('notification-symbol')).toHaveText(symbol);
    await expect(it.getByTestId('notification-condition')).toHaveText(condition);
    await expect(it.getByTestId('notification-target')).toHaveText(target);
    await expect(it.getByTestId('notification-triggered-price')).toHaveText(now);
    await expect(it.getByTestId('notification-time')).toHaveText(viDateTime(createdAt)); // user timezone Asia/Ho_Chi_Minh
    await expect(it).toHaveAttribute('data-unread', String(unread));
  };
  await expectItem(ethN.id, viBelow('ETHUSDT', viPrice(ethTarget), viPrice(round(ethTarget - 1))), 'ETHUSDT', 'Giảm xuống dưới', viPrice(ethTarget), viPrice(round(ethTarget - 1)), ethN.createdAt, true);
  await expectItem(btcN.id, viAbove('BTCUSDT', viPrice(btcTarget), viPrice(round(btcTarget + 1))), 'BTCUSDT', 'Vượt lên trên', viPrice(btcTarget), viPrice(round(btcTarget + 1)), btcN.createdAt, true);
  await expectItem(seeded.id, viAbove('SOLUSDT', viPrice(100), viPrice(101.5)), 'SOLUSDT', 'Vượt lên trên', viPrice(100), viPrice(101.5), seeded.createdAt, false);
  // Unread items are visually different from read ones.
  const bg = (id: number) => item(page, id).evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(await bg(ethN.id)).not.toBe(await bg(seeded.id));
});

test('AC-NOTIF-03 mark read and mark all read', async ({ page, request }) => {
  await loginViaUi(page);
  const token = apiSession(request);
  const price = await lastPrice(request, 'BTCUSDT');
  await apiCreateAlert(request, await token(), 'BTCUSDT', 'ABOVE', round(price + 100));
  await pushTick(request, 'BTCUSDT', round(price + 200));
  await expect(badge(page)).toHaveText('2');
  const [btcN, seeded] = (await apiNotifications(request, await token())).items;

  // Click one → read, badge −1, chart opens that symbol.
  await page.getByTestId('bell').click();
  await item(page, seeded.id).click();
  await expect(page).toHaveURL(/\/trade\/SOLUSDT\?tf=1h$/);
  await expect(page.getByTestId('chart-symbol')).toHaveText('SOL/USDT');
  await expect(badge(page)).toHaveText('1');
  await page.getByTestId('bell').click();
  await expect(item(page, seeded.id)).toHaveAttribute('data-unread', 'false');
  await expect(item(page, btcN.id)).toHaveAttribute('data-unread', 'true');

  // Mark all → badge hidden.
  await page.getByTestId('notifications-mark-all').click();
  await expect(badge(page)).toHaveCount(0);
  await expect(item(page, btcN.id)).toHaveAttribute('data-unread', 'false');

  // Survives reload.
  await page.reload();
  await expect(page.getByTestId('user-menu')).toBeVisible();
  await page.getByTestId('bell').click();
  await expect(item(page, btcN.id)).toHaveAttribute('data-unread', 'false');
  await expect(item(page, seeded.id)).toHaveAttribute('data-unread', 'false');
  await expect(badge(page)).toHaveCount(0);
  expect((await apiNotifications(request, await token())).unreadCount).toBe(0);
});

test('AC-NOTIF-04 offline trigger shown on next login', async ({ page, request }) => {
  await loginViaUi(page);
  const price = await lastPrice(request, 'BTCUSDT');
  await openAlertsTab(page);
  const target = round(price + 100);
  await createAlertViaUi(page, 'ABOVE', target);
  await logoutViaUi(page); // no open tab of this user any more

  await pushTick(request, 'BTCUSDT', round(target + 10));
  const token = apiSession(request);
  await expect.poll(async () => (await apiNotifications(request, await token())).unreadCount).toBe(2); // seeded + new, stored while offline

  await loginViaUi(page);
  await expect(notificationToast(page)).toHaveText('Bạn có 2 thông báo chưa đọc');
  await expect(badge(page)).toHaveText('2');
  await page.getByTestId('bell').click();
  await expect(page.getByTestId('notifications-panel').getByTestId('notification-text').first()).toHaveText(viAbove('BTCUSDT', viPrice(target), viPrice(round(target + 10))));
});

test('AC-NOTIF-05 multi-tab delivery and read sync', async ({ page, context, request }) => {
  await loginViaUi(page);
  const tab2 = await context.newPage();
  await tab2.goto('/trade/BTCUSDT');
  await expect(tab2.getByTestId('user-menu')).toBeVisible(); // same session
  await expect(badge(page)).toHaveText('1');
  await expect(badge(tab2)).toHaveText('1');

  const token = apiSession(request);
  const price = await lastPrice(request, 'BTCUSDT');
  const eth = await lastPrice(request, 'ETHUSDT');
  const target = round(price + 100);
  await apiCreateAlert(request, await token(), 'BTCUSDT', 'ABOVE', target);
  await apiCreateAlert(request, await token(), 'ETHUSDT', 'BELOW', round(eth - 10));
  const text = viAbove('BTCUSDT', viPrice(target), viPrice(round(target + 3)));

  let deadline = Date.now() + 5000;
  await pushTick(request, 'BTCUSDT', round(target + 3));
  await expect(notificationToast(page).filter({ hasText: 'BTCUSDT' })).toHaveText(text, { timeout: left(deadline) });
  await expect(notificationToast(tab2).filter({ hasText: 'BTCUSDT' })).toHaveText(text, { timeout: left(deadline) });
  await expect(badge(page)).toHaveText('2');
  await expect(badge(tab2)).toHaveText('2');

  // Read one in tab 1 → tab 2 badge follows within 5 s.
  const [btcN] = (await apiNotifications(request, await token())).items;
  await page.getByTestId('bell').click();
  deadline = Date.now() + 5000;
  await item(page, btcN.id).click();
  await expect(badge(page)).toHaveText('1');
  await expect(badge(tab2)).toHaveText('1', { timeout: left(deadline) });

  // A second notification, then "mark all" in tab 2 → tab 1 badge hidden within 5 s.
  await pushTick(request, 'ETHUSDT', round(eth - 11));
  await expect(badge(page)).toHaveText('2');
  await expect(badge(tab2)).toHaveText('2');
  await tab2.getByTestId('bell').click();
  deadline = Date.now() + 5000;
  await tab2.getByTestId('notifications-mark-all').click();
  await expect(badge(tab2)).toHaveCount(0);
  await expect(badge(page)).toHaveCount(0, { timeout: left(deadline) });
});
