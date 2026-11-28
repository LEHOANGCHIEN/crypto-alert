import { test, expect, type Locator, type Page } from '@playwright/test';
import { resetApp } from '../../helpers/reset';
import { loginViaUi } from '../../helpers/auth';
import { cssVar } from '../../helpers/chart';
import { left, lastPrice, pushTick, upstreamDisconnect, viPrice } from '../../helpers/market';

test.beforeEach(async ({ request }) => resetApp(request));

const LAYOUT_KEY = 'crypto-alert.layout';

async function openDashboard(page: Page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/chart/BTCUSDT');
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

const PULSE = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'DOGEUSDT'];

test('AC-UI-07 market pulse bar shows major pairs live and links to the chart', async ({ page, request }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/chart/BTCUSDT?tf=15m');
  const bar = page.getByTestId('pulse-bar');
  await expect(bar).toBeVisible();
  // Six pairs in the specified order (pairs missing from the tickers would be skipped; the mock has all six).
  await expect(bar.locator('[data-testid^="pulse-item-"]')).toHaveCount(PULSE.length);
  const ids = await bar.locator('[data-testid^="pulse-item-"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')));
  expect(ids).toEqual(PULSE.map((s) => `pulse-item-${s}`));

  // `BTC/USDT <price> <change %>` with the AC-MKT-04 colors (mock: ETH +3.24 %, SOL −5.10 %, XRP 0.00 %).
  const btc = await lastPrice(request, 'BTCUSDT');
  await expect(page.getByTestId('pulse-item-BTCUSDT')).toContainText('BTC/USDT');
  await expect(page.getByTestId('pulse-price-BTCUSDT')).toHaveText(viPrice(btc));
  await expect(page.getByTestId('pulse-change-ETHUSDT')).toHaveText('+3,24%');
  await expect(page.getByTestId('pulse-change-ETHUSDT')).toHaveClass(/text-up/);
  await expect(page.getByTestId('pulse-change-SOLUSDT')).toHaveText('−5,10%');
  await expect(page.getByTestId('pulse-change-SOLUSDT')).toHaveClass(/text-down/);
  await expect(page.getByTestId('pulse-change-XRPUSDT')).toHaveText('0,00%');
  await expect(page.getByTestId('pulse-change-XRPUSDT')).not.toHaveClass(/text-up|text-down/);

  // A mock tick for ETHUSDT updates its pulse price within 2 s.
  await expect(page.getByTestId('market-list')).toHaveAttribute('data-live', 'true'); // tickers subscription acknowledged
  const price = Math.round((await lastPrice(request, 'ETHUSDT')) * 1.01 * 100) / 100;
  const deadline = Date.now() + 2_000;
  await pushTick(request, 'ETHUSDT', price);
  await expect(page.getByTestId('pulse-price-ETHUSDT')).toHaveText(viPrice(price), { timeout: left(deadline) });

  // Click → /chart/<SYMBOL>?tf=<current tf>.
  await page.getByTestId('pulse-item-SOLUSDT').click();
  await expect(page).toHaveURL(/\/chart\/SOLUSDT\?tf=15m$/);

  // At 1024 px all six items fit fully inside the bar.
  await page.setViewportSize({ width: 1024, height: 768 });
  await expect(bar).toBeVisible();
  const barBox = await bar.boundingBox();
  expect(barBox).not.toBeNull();
  for (const s of PULSE) {
    const box = await page.getByTestId(`pulse-item-${s}`).boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(barBox!.x);
    expect(box!.x + box!.width).toBeLessThanOrEqual(barBox!.x + barBox!.width);
  }

  // Hidden below 1024 px.
  await page.setViewportSize({ width: 900, height: 800 });
  await expect(bar).toBeHidden();
});

const rgb = (hex: string) => {
  const h = hex.replace('#', '');
  return `rgb(${parseInt(h.slice(0, 2), 16)}, ${parseInt(h.slice(2, 4), 16)}, ${parseInt(h.slice(4, 6), 16)})`;
};
const clockText = (epoch: number, timeZone: string) =>
  new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).format(epoch);

test('AC-UI-08 status bar shows connection state, last update and a clock', async ({ page, context, request }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/chart/BTCUSDT');
  const bar = page.getByTestId('status-bar');
  const text = page.getByTestId('status-text');
  const dot = page.getByTestId('status-dot');
  await expect(bar).toBeVisible();
  await expect(page.getByTestId('statusbar-disclaimer')).toBeVisible();

  // Connected: exact Vietnamese text, dot = accent (never the up/down colors).
  await expect(text).toHaveText('Đã kết nối');
  await expect(dot).toHaveAttribute('data-state', 'connected');
  const accent = rgb(await cssVar(page, '--color-accent'));
  await expect(dot).toHaveCSS('background-color', accent);
  expect(accent).not.toBe(rgb(await cssVar(page, '--color-up')));
  expect(accent).not.toBe(rgb(await cssVar(page, '--color-down')));
  await page.getByTestId('lang-en').click();
  await expect(text).toHaveText('Connected');

  // Offline → "Reconnecting…" within 5 s (warning dot), online → "Connected".
  await context.setOffline(true);
  await expect(text).toHaveText('Reconnecting…', { timeout: 5_000 });
  await expect(dot).toHaveCSS('background-color', rgb(await cssVar(page, '--color-warning')));
  await context.setOffline(false);
  await expect(text).toHaveText('Connected', { timeout: 5_000 });

  // Upstream feed delayed (AC-RT-06 state) → "Market data delayed", then back.
  await upstreamDisconnect(request, 3_000);
  await expect(text).toHaveText('Market data delayed', { timeout: 5_000 });
  await expect(dot).toHaveCSS('background-color', rgb(await cssVar(page, '--color-warning')));
  await expect(text).toHaveText('Connected', { timeout: 10_000 });

  // Last market update: a tick moves it (epoch grows) and it is shown in the user's timezone.
  const last = page.getByTestId('status-last-update');
  await expect(last).toHaveAttribute('data-epoch', /\d+/);
  const first = Number(await last.getAttribute('data-epoch'));
  await expect(page.getByTestId('market-list')).toHaveAttribute('data-live', 'true'); // tickers subscription acknowledged
  await pushTick(request, 'BTCUSDT', (await lastPrice(request, 'BTCUSDT')) + 1);
  await expect.poll(async () => Number(await last.getAttribute('data-epoch'))).toBeGreaterThan(first);
  const epoch = Number(await last.getAttribute('data-epoch'));
  await expect(last).toHaveText(clockText(epoch, 'Asia/Ho_Chi_Minh'));

  // Clock ticks every second, guest = Asia/Ho_Chi_Minh.
  const clock = page.getByTestId('status-clock');
  const t0 = Number(await clock.getAttribute('data-epoch'));
  await expect.poll(async () => Number(await clock.getAttribute('data-epoch'))).toBeGreaterThan(t0);
  const t1 = Number(await clock.getAttribute('data-epoch'));
  await expect(clock).toHaveText(clockText(t1, 'Asia/Ho_Chi_Minh'));

  // Logged-in user with timezone UTC: the clock follows the account timezone.
  await loginViaUi(page);
  await page.goto('/account');
  await page.getByTestId('pref-timezone').selectOption('UTC');
  await page.getByTestId('save-preferences').click();
  await page.goto('/chart/BTCUSDT');
  await expect.poll(async () => {
    const e = Number(await clock.getAttribute('data-epoch'));
    return (await clock.textContent()) === clockText(e, 'UTC');
  }).toBe(true);
});

test('AC-UI-10 auth pages two-column layout', async ({ page }) => {
  const box = async (l: Locator) => (await l.boundingBox())!;
  for (const route of ['login', 'register'] as const) {
    const root = page.getByTestId(`page-${route}`);
    const form = page.getByTestId('auth-form');

    // --- 1440×900: two equal columns under the header. ---
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/${route}`);
    await expect(root).toBeVisible();
    const panel = page.getByTestId('auth-brand-panel');
    const column = page.getByTestId('auth-form-column');
    await expect(panel).toBeVisible();
    const p = await box(panel);
    const c = await box(column);
    expect(Math.abs(p.width - c.width)).toBeLessThanOrEqual(1);
    expect(p.width).toBeGreaterThan(600);
    expect(Math.abs(p.y - c.y)).toBeLessThanOrEqual(1);
    expect(p.y).toBeGreaterThanOrEqual(56); // under the 56 px header

    // Brand panel: translated headline, three feature lines, decorative line; content ≤ 520 px, centered in the panel.
    await expect(panel.getByRole('heading', { level: 2 })).toHaveText('Theo dõi thị trường tiền mã hóa theo thời gian thực');
    await expect(panel.locator('li')).toHaveCount(3);
    await expect(panel.locator('svg polyline')).toHaveCount(1);
    await expect(panel).not.toContainText('auth.brand');
    const content = await box(page.getByTestId('auth-brand-content'));
    expect(content.width).toBeLessThanOrEqual(520);
    expect(Math.abs(content.x + content.width / 2 - (p.x + p.width / 2))).toBeLessThanOrEqual(2);

    // Form: 440 px wide, centered horizontally and vertically (±40 px) in the right column.
    const r = await box(root);
    expect(Math.abs(r.width - 440)).toBeLessThanOrEqual(1);
    expect(Math.abs(r.x + r.width / 2 - (c.x + c.width / 2))).toBeLessThanOrEqual(2);
    expect(Math.abs(r.y + r.height / 2 - (c.y + c.height / 2))).toBeLessThanOrEqual(40);

    // Title 28 px, inputs 46 px high, primary button 48 px high and as wide as the form.
    expect(await root.getByRole('heading', { level: 1 }).evaluate((e) => getComputedStyle(e).fontSize)).toBe('28px');
    const inputs = form.locator('input');
    const count = await inputs.count();
    expect(count).toBe(route === 'login' ? 2 : 4);
    for (let i = 0; i < count; i++) expect(Math.abs((await box(inputs.nth(i))).height - 46)).toBeLessThanOrEqual(1);
    const f = await box(form);
    const submit = await box(page.getByTestId(`submit-${route}`));
    expect(Math.abs(submit.height - 48)).toBeLessThanOrEqual(1);
    expect(Math.abs(submit.width - f.width)).toBeLessThanOrEqual(1);

    // --- 390×844: brand panel hidden, form full width with 16 px side margins, no horizontal scroll. ---
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(panel).toBeHidden();
    const m = await box(root);
    expect(Math.abs(m.x - 16)).toBeLessThanOrEqual(1);
    expect(Math.abs(390 - (m.x + m.width) - 16)).toBeLessThanOrEqual(1);
    // The layout settles after the resize: poll (threshold unchanged: no horizontal scroll at all).
    const overflowDiff = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    await expect.poll(overflowDiff, { message: `${route}: page scrolls horizontally` }).toBeLessThanOrEqual(0);
    await expect.poll(() => page.evaluate(() => (document.querySelector('main') as HTMLElement).scrollWidth - (document.querySelector('main') as HTMLElement).clientWidth)).toBeLessThanOrEqual(0);
  }
});
