import { test, expect, type Page } from '@playwright/test';
import { resetApp } from '../helpers/reset';
import { NEW_USER, loginViaUi, registerViaUi } from '../helpers/auth';
import { lastPrice, left, pushTick, upstreamStreams, viPrice } from '../helpers/market';
import { notificationToast } from '../helpers/toast';
import {
  apiAlerts,
  apiCreateAlert,
  apiDeleteAlert,
  apiNotifications,
  apiSession,
  createAlertViaUi,
  enPrice,
  openAlertsTab,
  pricePrecision,
  recordToasts,
  round,
  shownToasts,
  viDateTime,
  workerReload,
} from '../helpers/alerts';

test.beforeEach(async ({ request }) => resetApp(request));

const VI_TEXT = {
  ABOVE: 'Vượt lên trên',
  BELOW: 'Giảm xuống dưới',
  REQUIRED: 'Trường này là bắt buộc.',
  OUT_OF_RANGE: 'Giá trị nằm ngoài phạm vi cho phép.',
  TOO_MANY_DECIMALS: 'Tối đa 8 chữ số thập phân.',
  ALREADY_MET: 'Điều kiện cảnh báo đã thỏa mãn ở giá hiện tại.',
  LIMIT: 'Bạn đã đạt tối đa 20 cảnh báo đang hoạt động.',
};
const viAbove = (symbol: string, target: string, now: string) => `${symbol} đã vượt lên trên ${target} (hiện tại ${now})`;
const viBelow = (symbol: string, target: string, now: string) => `${symbol} đã giảm xuống dưới ${target} (hiện tại ${now})`;

const activeRow = (page: Page, id: number) => page.getByTestId('alerts-active').getByTestId(`alert-row-${id}`);
const triggeredRow = (page: Page, id: number) => page.getByTestId('alerts-triggered').getByTestId(`alert-row-${id}`);

test('AC-ALERT-01 create alert', async ({ page, request }) => {
  await loginViaUi(page);
  const price = await lastPrice(request, 'BTCUSDT');
  await openAlertsTab(page);

  // Prefilled: current chart symbol, "Above", target = current price.
  await expect(page.getByTestId('alert-symbol')).toHaveValue('BTCUSDT');
  await expect(page.getByTestId('alert-condition')).toHaveValue('ABOVE');
  await expect(page.getByTestId('alert-condition').locator('option:checked')).toHaveText(VI_TEXT.ABOVE);
  await expect(page.getByTestId('field-targetPrice')).toHaveValue(String(price));

  const target = round(price + 100);
  const alert = await createAlertViaUi(page, 'ABOVE', target);
  expect(alert).toMatchObject({ symbol: 'BTCUSDT', condition: 'ABOVE', targetPrice: target, status: 'ACTIVE' });

  const row = activeRow(page, alert.id);
  await expect(row.getByTestId('alert-row-symbol')).toHaveText('BTCUSDT');
  await expect(row.getByTestId('alert-row-condition')).toHaveText(VI_TEXT.ABOVE);
  await expect(row.getByTestId('alert-row-target')).toHaveText(viPrice(target));
  await expect(row.getByTestId('alert-created-at')).toHaveText(viDateTime(alert.createdAt));
  // Newest first, above the two seeded active alerts.
  await expect(page.getByTestId('alerts-active').locator('li').first()).toHaveAttribute('data-testid', `alert-row-${alert.id}`);
  await expect(page.getByTestId('alerts-active').locator('li')).toHaveCount(3);
});

test('AC-ALERT-02 alert validation and already-met', async ({ page, request }) => {
  await loginViaUi(page);
  const price = await lastPrice(request, 'BTCUSDT');
  await openAlertsTab(page);
  let posts = 0;
  page.on('request', (r) => {
    if (r.method() === 'POST' && r.url().endsWith('/api/v1/alerts')) posts++;
  });

  const input = page.getByTestId('field-targetPrice');
  const error = page.getByTestId('error-targetPrice');
  for (const [value, text] of [
    ['', VI_TEXT.REQUIRED],
    ['0', VI_TEXT.OUT_OF_RANGE],
    ['-5', VI_TEXT.OUT_OF_RANGE],
    ['1.123456789', VI_TEXT.TOO_MANY_DECIMALS],
  ]) {
    await input.fill(value);
    await page.getByTestId('alert-submit').click();
    await expect(error).toHaveText(text);
  }
  expect(posts).toBe(0); // client-side errors never reach the server

  // Above with target ≤ current price, Below with target ≥ current price → translated ALERT_CONDITION_ALREADY_MET.
  for (const [condition, target] of [
    ['ABOVE', price],
    ['ABOVE', round(price - 50)],
    ['BELOW', price],
    ['BELOW', round(price + 50)],
  ] as const) {
    await page.getByTestId('alert-condition').selectOption(condition);
    await input.fill(String(target));
    const res = page.waitForResponse((r) => r.url().endsWith('/api/v1/alerts') && r.request().method() === 'POST');
    await page.getByTestId('alert-submit').click();
    expect((await res).status()).toBe(422);
    await expect(page.getByTestId('alert-form-error')).toHaveText(VI_TEXT.ALREADY_MET);
  }
  await expect(error).toHaveCount(0);
  await expect(page.getByTestId('alerts-active').locator('li')).toHaveCount(2); // only the seeded alerts
});

test('AC-ALERT-03 above alert triggers toast within 5s', async ({ page, request }) => {
  await loginViaUi(page);
  await page.getByTestId('lang-en').click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  const price = await lastPrice(request, 'BTCUSDT');
  await openAlertsTab(page);
  await expect(page.getByTestId('bell-badge')).toHaveText('1'); // seeded unread notification

  const target = round(price + 100);
  const alert = await createAlertViaUi(page, 'ABOVE', target);
  const now = round(target + 25.5);
  const text = `BTCUSDT rose above ${enPrice(target)} (now ${enPrice(now)})`;

  const deadline = Date.now() + 5000;
  await pushTick(request, 'BTCUSDT', now);
  await expect(notificationToast(page).filter({ hasText: 'BTCUSDT rose above' })).toHaveText(text, { timeout: left(deadline) });
  await expect(triggeredRow(page, alert.id)).toBeVisible({ timeout: left(deadline) });
  await expect(page.getByTestId('bell-badge')).toHaveText('2', { timeout: left(deadline) });
  await expect(activeRow(page, alert.id)).toHaveCount(0);
  await expect(triggeredRow(page, alert.id).getByTestId('alert-triggered-price')).toHaveText(enPrice(now));
  await expect(triggeredRow(page, alert.id).getByTestId('alert-triggered-at')).toHaveText(/^\d{2}\/\d{2}\/\d{4}, \d{1,2}:\d{2} (AM|PM)$/);

  // Reload → the notification is still listed.
  await page.reload();
  await expect(page.getByTestId('bell-badge')).toHaveText('2');
  await page.getByTestId('bell').click();
  await expect(page.getByTestId('notifications-panel').getByTestId('notification-text').first()).toHaveText(text);
});

test('AC-ALERT-04 below alert triggers toast within 5s', async ({ page, request }) => {
  await loginViaUi(page);
  const price = await lastPrice(request, 'BTCUSDT');
  await openAlertsTab(page);
  await expect(page.getByTestId('bell-badge')).toHaveText('1');

  const target = round(price - 100);
  const alert = await createAlertViaUi(page, 'BELOW', target);
  const now = round(target - 12.25);

  const deadline = Date.now() + 5000;
  await pushTick(request, 'BTCUSDT', now);
  await expect(notificationToast(page).filter({ hasText: 'BTCUSDT đã giảm' })).toHaveText(viBelow('BTCUSDT', viPrice(target), viPrice(now)), { timeout: left(deadline) });
  await expect(triggeredRow(page, alert.id)).toBeVisible({ timeout: left(deadline) });
  await expect(page.getByTestId('bell-badge')).toHaveText('2', { timeout: left(deadline) });
  await expect(triggeredRow(page, alert.id).getByTestId('alert-triggered-price')).toHaveText(viPrice(now));
  await expect(triggeredRow(page, alert.id).getByTestId('alert-triggered-at')).toHaveText(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/);
});

test('AC-ALERT-05 alert is one-shot', async ({ page, request }) => {
  await recordToasts(page);
  await loginViaUi(page);
  const price = await lastPrice(request, 'BTCUSDT');
  const eth = await lastPrice(request, 'ETHUSDT');
  await openAlertsTab(page);
  const target = round(price + 100);
  const alert = await createAlertViaUi(page, 'ABOVE', target);
  const sentinel = await createAlertViaUi(page, 'ABOVE', round(eth + 10), 'ETHUSDT');

  await pushTick(request, 'BTCUSDT', round(target + 1));
  await expect(notificationToast(page).filter({ hasText: 'BTCUSDT' })).toBeVisible({ timeout: 5000 });
  await expect(page.getByTestId('bell-badge')).toHaveText('2');

  // More prices above and below X: nothing new may happen.
  for (const p of [target + 50, target - 50, target + 80, target - 80, target + 1]) await pushTick(request, 'BTCUSDT', round(p));
  // Sentinel: its notification is sent after anything the ticks above could have caused.
  await pushTick(request, 'ETHUSDT', round(eth + 20));
  await expect(notificationToast(page).filter({ hasText: 'ETHUSDT' })).toBeVisible({ timeout: 5000 });
  await expect(page.getByTestId('bell-badge')).toHaveText('3');

  const toasts = (await shownToasts(page)).filter((t) => t.startsWith('BTCUSDT'));
  expect(toasts).toEqual([viAbove('BTCUSDT', viPrice(target), viPrice(round(target + 1)))]);
  const token = apiSession(request);
  const { items } = await apiNotifications(request, await token());
  expect(items.filter((n) => n.payload.alertId === alert.id)).toHaveLength(1);
  expect(items.filter((n) => n.payload.alertId === sentinel.id)).toHaveLength(1);
  expect((await apiAlerts(request, await token())).find((a) => a.id === alert.id)?.triggeredPrice).toBe(round(target + 1));
});

test('AC-ALERT-06 deleted alert never triggers', async ({ page, request }) => {
  await recordToasts(page);
  await loginViaUi(page);
  const price = await lastPrice(request, 'BTCUSDT');
  const eth = await lastPrice(request, 'ETHUSDT');
  await openAlertsTab(page);
  const target = round(price + 100);
  const doomed = await createAlertViaUi(page, 'ABOVE', target);
  const sentinel = await createAlertViaUi(page, 'ABOVE', round(eth + 10), 'ETHUSDT');

  await page.getByTestId(`alert-delete-${doomed.id}`).click();
  await expect(activeRow(page, doomed.id)).toHaveCount(0);

  await pushTick(request, 'BTCUSDT', round(target + 500));
  await pushTick(request, 'ETHUSDT', round(eth + 20)); // sentinel
  await expect(notificationToast(page).filter({ hasText: 'ETHUSDT' })).toBeVisible({ timeout: 5000 });
  await expect(page.getByTestId('bell-badge')).toHaveText('2'); // seed + sentinel only
  expect((await shownToasts(page)).filter((t) => t.includes('BTCUSDT'))).toEqual([]);
  const token = apiSession(request);
  expect((await apiNotifications(request, await token())).items.filter((n) => n.payload.alertId === doomed.id)).toEqual([]);

  // Triggered alerts can be deleted too (history only).
  await expect(triggeredRow(page, sentinel.id)).toBeVisible();
  await page.getByTestId(`alert-delete-${sentinel.id}`).click();
  await expect(triggeredRow(page, sentinel.id)).toHaveCount(0);
  expect((await apiAlerts(request, await token())).map((a) => a.id)).not.toContain(sentinel.id);
  await page.reload();
  await openAlertsTab(page);
  await expect(page.getByTestId(`alert-row-${sentinel.id}`)).toHaveCount(0);
});

test('AC-ALERT-07 active alert limit 20', async ({ page, request }) => {
  await loginViaUi(page);
  const price = await lastPrice(request, 'BTCUSDT');
  const token = apiSession(request);
  // 2 seeded ACTIVE alerts + 18 = 20.
  for (let i = 0; i < 18; i++) await apiCreateAlert(request, await token(), 'BTCUSDT', 'ABOVE', round(price + 10 + i));
  await openAlertsTab(page);
  await expect(page.getByTestId('alerts-active').locator('li')).toHaveCount(20);

  await page.getByTestId('field-targetPrice').fill(String(round(price + 1000)));
  const res = page.waitForResponse((r) => r.url().endsWith('/api/v1/alerts') && r.request().method() === 'POST');
  await page.getByTestId('alert-submit').click();
  expect((await res).status()).toBe(409);
  await expect(page.getByTestId('alert-form-error')).toHaveText(VI_TEXT.LIMIT);
  await expect(page.getByTestId('alerts-active').locator('li')).toHaveCount(20);
});

test('AC-ALERT-08 alerts isolated between users', async ({ page, browser, request }) => {
  // A = demo user, B = a new user in another browser context.
  await loginViaUi(page);
  const contextB = await browser.newContext();
  const pageB = await contextB.newPage();
  await recordToasts(pageB);
  await registerViaUi(pageB);
  await expect(pageB.getByTestId('user-menu')).toBeVisible();

  const price = await lastPrice(request, 'BTCUSDT');
  const eth = await lastPrice(request, 'ETHUSDT');
  await openAlertsTab(page);
  const alertA = await createAlertViaUi(page, 'ABOVE', round(price + 100));

  await openAlertsTab(pageB);
  await expect(pageB.getByTestId('alerts-active-empty')).toBeVisible();
  await expect(pageB.getByTestId('alerts-triggered-empty')).toBeVisible();
  await expect(pageB.getByTestId('bell-badge')).toHaveCount(0);

  // B deleting A's alert → ALERT_NOT_FOUND; A's alert still exists.
  const tokenB = apiSession(request, NEW_USER.email, NEW_USER.password);
  const del = await apiDeleteAlert(request, await tokenB(), alertA.id);
  expect(del.status()).toBe(404);
  expect(((await del.json()) as { error: { code: string } }).error.code).toBe('ALERT_NOT_FOUND');
  await expect(activeRow(page, alertA.id)).toBeVisible();

  const sentinelB = await createAlertViaUi(pageB, 'ABOVE', round(eth + 10), 'ETHUSDT');
  await pushTick(request, 'BTCUSDT', round(price + 150));
  await expect(notificationToast(page).filter({ hasText: 'BTCUSDT' })).toBeVisible({ timeout: 5000 });
  // B's own trigger is delivered after anything A's trigger could have sent to B.
  await pushTick(request, 'ETHUSDT', round(eth + 20));
  await expect(notificationToast(pageB).filter({ hasText: 'ETHUSDT' })).toBeVisible({ timeout: 5000 });
  await expect(pageB.getByTestId('bell-badge')).toHaveText('1');
  expect((await shownToasts(pageB)).filter((t) => t.includes('BTCUSDT'))).toEqual([]);
  await expect(triggeredRow(pageB, sentinelB.id)).toBeVisible();
  await expect(pageB.getByTestId(`alert-row-${alertA.id}`)).toHaveCount(0);
  await contextB.close();
});

test('AC-ALERT-09 alerts survive worker reload', async ({ page, request }) => {
  await loginViaUi(page);
  const price = await lastPrice(request, 'BTCUSDT');
  await openAlertsTab(page);
  const target = round(price + 100);
  const alert = await createAlertViaUi(page, 'ABOVE', target);

  // Simulated backend restart: in-memory state rebuilt from the DB (2 seeded + 1 new ACTIVE alerts).
  expect(await workerReload(request)).toBe(3);

  const deadline = Date.now() + 5000;
  await pushTick(request, 'BTCUSDT', round(target + 5));
  await expect(notificationToast(page).filter({ hasText: 'BTCUSDT' })).toHaveText(viAbove('BTCUSDT', viPrice(target), viPrice(round(target + 5))), { timeout: left(deadline) });
  await expect(triggeredRow(page, alert.id)).toBeVisible({ timeout: left(deadline) });
});

test('AC-ALERT-10 alert on a symbol not being viewed', async ({ page, request }) => {
  await loginViaUi(page); // lands on the BTCUSDT chart
  await expect(page).toHaveURL(/\/trade\/BTCUSDT/);
  const doge = await lastPrice(request, 'DOGEUSDT');
  const d = await pricePrecision(request, 'DOGEUSDT');
  await openAlertsTab(page);
  await page.getByTestId('alert-symbol').selectOption('DOGEUSDT');
  await expect(page.getByTestId('field-targetPrice')).toHaveValue(String(doge)); // prefill follows the selected pair
  const target = round(doge * 1.1, d);
  const alert = await createAlertViaUi(page, 'ABOVE', target);
  expect(alert.symbol).toBe('DOGEUSDT');

  // Nobody views DOGEUSDT: no kline stream for it; the price comes from the all-market ticker stream.
  const streams = await upstreamStreams(request);
  expect(streams).toContain('!miniTicker@arr');
  expect(streams.filter((s) => s.startsWith('dogeusdt@'))).toEqual([]);

  const now = round(target * 1.01, d);
  const deadline = Date.now() + 5000;
  await pushTick(request, 'DOGEUSDT', now);
  await expect(notificationToast(page).filter({ hasText: 'DOGEUSDT' })).toHaveText(viAbove('DOGEUSDT', viPrice(target, d), viPrice(now, d)), { timeout: left(deadline) });
  await expect(triggeredRow(page, alert.id)).toBeVisible({ timeout: left(deadline) });
});
