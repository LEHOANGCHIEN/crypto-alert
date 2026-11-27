import { test, expect, type Locator, type Page } from '@playwright/test';
import { resetApp } from '../helpers/reset';
import { loginViaUi } from '../helpers/auth';
import { lastPrice, left, pushTick, viPrice } from '../helpers/market';
import { apiAlerts, apiNotifications, apiSession, createAlertViaUi, openAlertsTab, round, viDateTime, type Alert } from '../helpers/alerts';

test.beforeEach(async ({ request }) => resetApp(request));

const LAYOUT_KEY = 'crypto-alert.layout';
const saved = (page: Page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? 'null'), LAYOUT_KEY);

async function openTrade(page: Page, symbol = 'BTCUSDT') {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`/trade/${symbol}`);
  await expect(page.getByTestId('chart-root')).toHaveAttribute('data-live', `${symbol}:1h`);
}

const panel = (page: Page) => page.getByTestId('bottom-panel');
const tab = (page: Page, id: 'active' | 'triggered' | 'notifications') => page.getByTestId(`bottom-tab-${id}`);
const height = async (l: Locator) => (await l.boundingBox())!.height;

/** Waits until the element is `h` px high (±2). */
async function expectHeight(l: Locator, h: number) {
  await expect.poll(async () => Math.abs((await height(l)) - h)).toBeLessThanOrEqual(2);
}

async function dragVertically(page: Page, handle: Locator, dy: number) {
  const b = (await handle.boundingBox())!;
  const x = b.x + b.width / 2;
  const y = b.y + b.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y + dy, { steps: 8 });
  await page.mouse.up();
}

/** vi percent with sign, same format as the app (AC-I18N-04). */
const viPercent = (v: number) => `${v > 0 ? '+' : '−'}${new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(v))}%`;

test('AC-ALERT-11 bottom panel', async ({ page, request }) => {
  // --- Guest: translated login prompt, no data. ---
  await openTrade(page);
  await expect(panel(page)).toBeVisible();
  await expect(page.getByTestId('bottom-login-prompt')).toBeVisible();
  await expect(page.getByTestId('bottom-login-link')).toHaveAttribute('href', '/login');

  // --- Logged in: Active alerts tab (seed: BTCUSDT above 1,000,000 and ETHUSDT below 100). ---
  await loginViaUi(page);
  await expect(page.getByTestId('chart-root')).toHaveAttribute('data-live', 'BTCUSDT:1h');
  const session = apiSession(request);
  const alerts = await apiAlerts(request, await session());
  const seededBtc = alerts.find((a) => a.symbol === 'BTCUSDT' && a.status === 'ACTIVE') as Alert;
  const seededSol = alerts.find((a) => a.status === 'TRIGGERED') as Alert;
  const btcPrice = await lastPrice(request, 'BTCUSDT');

  await expect(tab(page, 'active')).toHaveText('Cảnh báo đang chạy (2)');
  await expect(tab(page, 'triggered')).toHaveText('Đã kích hoạt');
  await expect(tab(page, 'notifications')).toHaveText('Thông báo');
  await expect(tab(page, 'active')).toHaveAttribute('aria-selected', 'true');
  const row = page.getByTestId(`bottom-alert-${seededBtc.id}`);
  await expect(row.getByTestId('bottom-alert-symbol')).toHaveText('BTC/USDT');
  await expect(row.getByTestId('bottom-alert-symbol')).toHaveAttribute('data-symbol', 'BTCUSDT');
  await expect(row.getByTestId('bottom-alert-condition')).toHaveText('Vượt lên trên');
  await expect(row.getByTestId('bottom-alert-target')).toHaveText(viPrice(1_000_000));
  await expect(row.getByTestId('bottom-alert-current')).toHaveText(viPrice(btcPrice));
  await expect(row.getByTestId('bottom-alert-distance')).toHaveText(viPercent(((1_000_000 - btcPrice) / btcPrice) * 100));
  await expect(row.getByTestId('bottom-alert-created')).toHaveText(viDateTime(seededBtc.createdAt));
  await expect(page.getByTestId(`bottom-alert-delete-${seededBtc.id}`)).toBeVisible();
  await expect(page.getByTestId('bottom-active').locator('tbody tr')).toHaveCount(2);

  // --- Triggered tab. ---
  await tab(page, 'triggered').click();
  const solRow = page.getByTestId(`bottom-alert-${seededSol.id}`);
  await expect(solRow.getByTestId('bottom-alert-symbol')).toHaveText('SOL/USDT');
  await expect(solRow.getByTestId('bottom-alert-condition')).toHaveText('Vượt lên trên');
  await expect(solRow.getByTestId('bottom-alert-target')).toHaveText(viPrice(100));
  await expect(solRow.getByTestId('bottom-alert-triggered-at')).toHaveText(viDateTime(seededSol.triggeredAt as string));

  // --- "Current pair only" filters all three tabs (BTCUSDT: 1 active, 0 triggered, 0 notifications). ---
  const only = page.getByTestId('bottom-current-only');
  await only.check();
  await expect(page.getByTestId('bottom-triggered-empty')).toBeVisible();
  await tab(page, 'notifications').click();
  await expect(page.getByTestId('bottom-notifications-empty')).toBeVisible();
  await tab(page, 'active').click();
  await expect(tab(page, 'active')).toHaveText('Cảnh báo đang chạy (1)');
  await expect(page.getByTestId('bottom-active').locator('tbody tr')).toHaveCount(1);
  await expect(page.getByTestId(`bottom-alert-${seededBtc.id}`)).toBeVisible();

  // The filter follows the opened pair: on SOLUSDT the triggered alert and its notification show, the active tab is empty.
  await page.getByTestId('market-row-SOLUSDT').click();
  await expect(page).toHaveURL(/\/trade\/SOLUSDT/);
  await expect(page.getByTestId('bottom-active-empty')).toBeVisible();
  await expect(tab(page, 'active')).toHaveText('Cảnh báo đang chạy (0)');
  await tab(page, 'triggered').click();
  await expect(page.getByTestId(`bottom-alert-${seededSol.id}`)).toBeVisible();
  await expect(page.getByTestId('bottom-triggered').locator('tbody tr')).toHaveCount(1);
  await tab(page, 'notifications').click();
  await expect(page.getByTestId('bottom-notifications').locator('li')).toHaveCount(1);

  await only.uncheck();
  await tab(page, 'triggered').click();
  await expect(page.getByTestId('bottom-triggered').locator('tbody tr')).toHaveCount(1);
  await tab(page, 'active').click();
  await expect(page.getByTestId('bottom-active').locator('tbody tr')).toHaveCount(2);

  // --- Notifications tab: unread marker; clicking a row marks it read (badge goes away). ---
  const notes = (await apiNotifications(request, await session())).items;
  expect(notes).toHaveLength(1);
  await tab(page, 'notifications').click();
  const note = page.getByTestId(`bottom-notification-${notes[0].id}`);
  await expect(note).toHaveAttribute('data-unread', 'true');
  await expect(note).toContainText('SOLUSDT đã vượt lên trên');
  await expect(page.getByTestId('bell-badge')).toHaveText('1');
  const read = page.waitForResponse((r) => r.url().endsWith(`/notifications/${notes[0].id}/read`) && r.request().method() === 'POST' && r.status() !== 401);
  await note.click();
  expect((await read).status()).toBe(200);
  await expect(note).toHaveAttribute('data-unread', 'false');
  await expect(page.getByTestId('bell-badge')).toHaveCount(0);

  // --- Creating an alert in the right panel shows it in the bottom panel within 2 s; a mock trigger moves it to Triggered. ---
  await page.goto('/trade/BTCUSDT');
  await expect(page.getByTestId('chart-root')).toHaveAttribute('data-live', 'BTCUSDT:1h');
  await openAlertsTab(page);
  await tab(page, 'active').click();
  const target = round(btcPrice + 100);
  const created = await createAlertViaUi(page, 'ABOVE', target);
  await expect(page.getByTestId(`bottom-alert-${created.id}`)).toBeVisible({ timeout: 2000 });
  await expect(tab(page, 'active')).toHaveText('Cảnh báo đang chạy (3)');
  await expect(page.getByTestId(`bottom-alert-${created.id}`).getByTestId('bottom-alert-target')).toHaveText(viPrice(target));

  const deadline = Date.now() + 2000;
  await pushTick(request, 'BTCUSDT', target + 1);
  await expect(page.getByTestId(`bottom-alert-${created.id}`)).toHaveCount(0, { timeout: left(deadline) });
  await expect(tab(page, 'active')).toHaveText('Cảnh báo đang chạy (2)');
  await tab(page, 'triggered').click();
  await expect(page.getByTestId(`bottom-alert-${created.id}`).getByTestId('bottom-alert-target')).toHaveText(viPrice(target));

  // --- Resize and collapse (state kept in crypto-alert.layout). ---
  await page.reload();
  await expect(page.getByTestId('chart-root')).toHaveAttribute('data-live', 'BTCUSDT:1h');
  const body = page.getByTestId('bottom-panel-body');
  const handle = page.getByTestId('panel-resize-bottom');
  const chart = page.getByTestId('panel-chart');
  await expect(handle).toHaveAttribute('role', 'separator');
  await expect(handle).toHaveAttribute('aria-orientation', 'horizontal');
  await expectHeight(panel(page), 240);

  // Drag up 60 px → 300 px.
  await dragVertically(page, handle, -60);
  await expectHeight(panel(page), 300);
  expect((await saved(page)).bottom).toMatchObject({ height: 300, collapsed: false });

  // Limits: min 120 px, max 60 % of the center column height.
  await dragVertically(page, handle, 2000);
  await expectHeight(panel(page), 120);
  await dragVertically(page, handle, -2000);
  const max = Math.floor((await height(chart)) * 0.6);
  await expect.poll(async () => Math.abs((await height(panel(page))) - max)).toBeLessThanOrEqual(2);

  // Keyboard: ↓ shrinks by 16 px, double-click restores the default.
  await handle.focus();
  const before = await height(panel(page));
  await page.keyboard.press('ArrowDown');
  await expectHeight(panel(page), before - 16);
  await handle.dblclick();
  await expectHeight(panel(page), 240);

  // Kept after reload.
  await dragVertically(page, handle, -40);
  await expectHeight(panel(page), 280);
  await page.reload();
  await expect(page.getByTestId('chart-root')).toHaveAttribute('data-live', 'BTCUSDT:1h');
  await expectHeight(panel(page), 280);

  // Collapse to the tab row; hidden body, tabs stay; state kept after reload; expand restores the previous height.
  await page.getByTestId('panel-collapse-bottom').click();
  await expect(panel(page)).toHaveAttribute('data-collapsed', 'true');
  await expect(body).toHaveCount(0);
  await expect(tab(page, 'active')).toBeVisible();
  await expect.poll(async () => height(panel(page))).toBeLessThanOrEqual(42);
  expect((await saved(page)).bottom).toMatchObject({ height: 280, collapsed: true });
  await page.reload();
  await expect(panel(page)).toHaveAttribute('data-collapsed', 'true');
  await page.getByTestId('panel-expand-bottom').click();
  await expect(body).toBeVisible();
  await expectHeight(panel(page), 280);

  // Not shown below 1024 px.
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(panel(page)).toBeHidden();
});
