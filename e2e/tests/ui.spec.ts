import { test, expect, type Locator, type Page } from '@playwright/test';
import { resetApp } from '../helpers/reset';

test.beforeEach(async ({ request }) => resetApp(request));

const LAYOUT_KEY = 'crypto-alert.layout';

async function openDashboard(page: Page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/trade/BTCUSDT');
  await expect(page.getByTestId('chart-root')).toHaveAttribute('data-candle-count', '1000');
}

const width = async (l: Locator) => (await l.boundingBox())!.width;

/** Waits until the element is `w` px wide (±2). */
async function expectWidth(l: Locator, w: number) {
  await expect.poll(async () => Math.abs((await width(l)) - w)).toBeLessThanOrEqual(2);
}

async function center(l: Locator) {
  const b = (await l.boundingBox())!;
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}

/** Full mouse drag of a handle by dx pixels. */
async function drag(page: Page, handle: Locator, dx: number) {
  const { x, y } = await center(handle);
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y, { steps: 8 });
  await page.mouse.up();
}

const saved = (page: Page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? 'null'), LAYOUT_KEY);

test('AC-UI-05 side columns can be resized by drag and keyboard', async ({ page }) => {
  const klineRequests: string[] = [];
  page.on('request', (r) => {
    if (r.url().includes('/market/klines')) klineRequests.push(r.url());
  });
  await openDashboard(page);
  const market = page.getByTestId('panel-market');
  const side = page.getByTestId('panel-side');
  const chart = page.getByTestId('panel-chart');
  const root = page.getByTestId('chart-root');
  const left = page.getByTestId('panel-resize-left');
  const right = page.getByTestId('panel-resize-right');

  await expect(left).toHaveAttribute('role', 'separator');
  await expect(right).toHaveAttribute('role', 'separator');
  await expectWidth(market, 240);
  await expectWidth(side, 320);
  const chartBefore = await width(chart);
  await expect(root).toHaveAttribute('data-canvas-width', String(Math.round(chartBefore)));
  const requestsBefore = klineRequests.length;

  // Left handle 100 px right → market list 340 px and the chart redraws narrower.
  await drag(page, left, 100);
  await expectWidth(market, 340);
  await expect.poll(async () => Number(await root.getAttribute('data-canvas-width'))).toBe(Math.round(await width(chart)));
  expect(chartBefore - (await width(chart))).toBeGreaterThanOrEqual(98);
  const canvasMax = await root.evaluate((el) => Math.max(...[...el.querySelectorAll('canvas')].map((c) => c.clientWidth)));
  expect(canvasMax).toBeLessThanOrEqual(Math.round(await width(chart)));
  expect(canvasMax).toBeGreaterThan(Math.round(await width(chart)) - 120);

  // Right handle 80 px left → right panel 400 px.
  await drag(page, right, -80);
  await expectWidth(side, 400);
  // The chart followed the new size without reloading its data.
  expect(klineRequests.length).toBe(requestsBefore);

  // Both widths are kept after a reload (localStorage crypto-alert.layout).
  expect(await saved(page)).toMatchObject({ left: { width: 340, collapsed: false }, right: { width: 400, collapsed: false } });
  await page.reload();
  await expect(root).toHaveAttribute('data-candle-count', '1000');
  await expectWidth(market, 340);
  await expectWidth(side, 400);

  // Keyboard: handles are focusable, ←/→ change the width by 16 px.
  await left.focus();
  await page.keyboard.press('ArrowRight');
  await expect(left).toHaveAttribute('aria-valuenow', '356');
  await expectWidth(market, 356);
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await expect(left).toHaveAttribute('aria-valuenow', '324');
  await right.focus();
  await page.keyboard.press('ArrowLeft'); // moving the right handle left grows the right panel
  await expect(right).toHaveAttribute('aria-valuenow', '416');
  await expectWidth(side, 416);

  // Double-click returns the panel to its default width.
  await left.dblclick();
  await right.dblclick();
  await expectWidth(market, 240);
  await expectWidth(side, 320);

  // Limits while open: left 180–480, right 260–520 (the width follows the pointer but never leaves the range).
  await drag(page, left, 2000);
  await expectWidth(market, 480);
  await drag(page, right, -2000);
  await expectWidth(side, 520);
  await expect(left).toHaveAttribute('aria-valuemin', '180');
  await expect(left).toHaveAttribute('aria-valuemax', '480');
  await expect(right).toHaveAttribute('aria-valuemin', '260');
  await expect(right).toHaveAttribute('aria-valuemax', '520');
  // Held below the minimum the panel shows exactly its minimum; releasing above it keeps the panel open.
  await left.dblclick();
  const l = await center(left);
  await page.mouse.move(l.x, l.y);
  await page.mouse.down();
  await page.mouse.move(l.x - 150, l.y, { steps: 6 });
  await expectWidth(market, 180);
  await page.mouse.move(l.x - 20, l.y, { steps: 4 });
  await page.mouse.up();
  await expectWidth(market, 220);
  await expect(market).toBeVisible();
});

test('AC-UI-06 side columns can be collapsed and reopened', async ({ page }) => {
  await openDashboard(page);
  const market = page.getByTestId('panel-market');
  const side = page.getByTestId('panel-side');
  const chart = page.getByTestId('panel-chart');
  await drag(page, page.getByTestId('panel-resize-left'), 100);
  await expectWidth(market, 340);
  const chartBefore = await width(chart);

  // Left: hidden completely (not visible, not tabbable), rail ≤ 24 px at the edge, chart takes the width.
  await page.getByTestId('panel-collapse-left').click();
  await expect(market).toBeHidden();
  await expect(market).toHaveCSS('display', 'none');
  await expect(page.getByTestId('panel-resize-left')).toBeHidden();
  const rail = page.getByTestId('panel-rail-left');
  await expect(rail).toBeVisible();
  const r = (await rail.boundingBox())!;
  expect(r.width).toBeLessThanOrEqual(24);
  expect(r.x).toBeLessThanOrEqual(1);
  await expect(page.getByTestId('panel-expand-left')).toBeVisible();
  await expect.poll(async () => (await width(chart)) - chartBefore).toBeGreaterThanOrEqual(310);
  expect((await saved(page)).left.collapsed).toBe(true);

  // Expand → previous width.
  await page.getByTestId('panel-expand-left').click();
  await expect(market).toBeVisible();
  await expectWidth(market, 340);
  await expect(rail).toHaveCount(0);

  // Right panel: same.
  const sideWidth = await width(side);
  await page.getByTestId('panel-collapse-right').click();
  await expect(side).toBeHidden();
  const rr = (await page.getByTestId('panel-rail-right').boundingBox())!;
  expect(rr.width).toBeLessThanOrEqual(24);
  expect(rr.x + rr.width).toBeGreaterThanOrEqual(1439);
  await page.getByTestId('panel-expand-right').click();
  await expectWidth(side, sideWidth);

  // Dragging a handle below the panel's minimum collapses it; the state survives a reload.
  await drag(page, page.getByTestId('panel-resize-right'), 200);
  await expect(side).toBeHidden();
  await drag(page, page.getByTestId('panel-resize-left'), -400);
  await expect(market).toBeHidden();
  await page.reload();
  await expect(page.getByTestId('chart-root')).toHaveAttribute('data-candle-count', '1000');
  await expect(market).toBeHidden();
  await expect(side).toBeHidden();
  await expect(page.getByTestId('panel-rail-left')).toBeVisible();
  await expect(page.getByTestId('panel-rail-right')).toBeVisible();

  // Mobile is not affected by the desktop state (AC-UI-02 behaviour).
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByTestId('mobile-tabs')).toBeVisible();
  await page.getByTestId('tab-markets').click();
  await expect(market).toBeVisible();
  await page.getByTestId('tab-watchlist').click();
  await expect(side).toBeVisible();
  await expect(page.getByTestId('panel-rail-left')).toBeHidden();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
