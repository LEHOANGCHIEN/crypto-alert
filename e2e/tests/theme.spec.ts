import { test, expect } from '@playwright/test';
import { resetApp } from '../helpers/reset';
import { loginViaUi } from '../helpers/auth';

test.beforeEach(async ({ request }) => resetApp(request));

test('AC-THEME-01 dark theme by default', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  // token really applied: page background is the dark --color-bg (#0F1115)
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(15, 17, 21)');
});

test('AC-THEME-03 theme persists for guest and account', async ({ page, browser, baseURL }) => {
  // guest: choice survives a reload
  await page.goto('/');
  await page.getByTestId('theme-toggle').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

  // after login the account setting (dark) overrides the guest choice
  await loginViaUi(page);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

  // logged-in choice is saved to the account
  const saved = page.waitForResponse((r) => r.url().endsWith('/api/v1/users/me/settings') && r.request().method() === 'PATCH');
  await page.getByTestId('theme-toggle').click();
  expect((await saved).ok()).toBe(true);

  const other = await browser.newContext({ baseURL });
  try {
    const p2 = await other.newPage();
    await loginViaUi(p2);
    await expect(p2.locator('html')).toHaveAttribute('data-theme', 'light');
  } finally {
    await other.close();
  }
});

/** Real pixel colour of the chart pane background, read from the chart's own canvases. */
async function paneBackgroundPixel(page: import('@playwright/test').Page): Promise<string | null> {
  return page.getByTestId('chart-root').evaluate((root) => {
    for (const canvas of Array.from(root.querySelectorAll('canvas'))) {
      const ctx = canvas.getContext('2d');
      if (!ctx || canvas.width < 20 || canvas.height < 20) continue;
      const [r, g, b, a] = ctx.getImageData(3, 3, 1, 1).data;
      if (a === 255) return `rgb(${r}, ${g}, ${b})`;
    }
    return null;
  });
}

const hexToRgb = (hex: string) => {
  let h = hex.replace('#', '');
  if (h.length === 3) h = [...h].map((c) => c + c).join(''); // the CSS minifier writes #fff for #ffffff
  return `rgb(${parseInt(h.slice(0, 2), 16)}, ${parseInt(h.slice(2, 4), 16)}, ${parseInt(h.slice(4, 6), 16)})`;
};

test('AC-THEME-02 toggle applies to page and chart', async ({ page }) => {
  await page.goto('/trade/BTCUSDT');
  const root = page.getByTestId('chart-root');
  await expect(root).toHaveAttribute('data-candle-count', '1000');
  const token = (name: string) => page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name);

  // Dark: chart colours are the dark tokens and the canvas is really painted with them.
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(await root.getAttribute('data-chart-background')).toBe(await token('--color-surface'));
  expect(hexToRgb((await root.getAttribute('data-chart-background'))!)).toBe('rgb(22, 26, 32)');
  expect(await root.getAttribute('data-chart-grid')).toBe(await token('--color-chart-grid'));
  await expect.poll(() => paneBackgroundPixel(page)).toBe('rgb(22, 26, 32)');
  expect(await root.getAttribute('data-chart-text')).toBe(await token('--color-text-muted'));
  const darkText = await root.getAttribute('data-chart-text');
  const darkUp = await root.getAttribute('data-chart-up');
  const darkDown = await root.getAttribute('data-chart-down');

  // Toggle without reloading.
  await page.getByTestId('theme-toggle').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(247, 248, 250)');
  await expect.poll(async () => hexToRgb((await root.getAttribute('data-chart-background'))!)).toBe('rgb(255, 255, 255)');
  expect(hexToRgb((await root.getAttribute('data-chart-grid'))!)).toBe('rgb(238, 240, 243)');
  await expect.poll(() => paneBackgroundPixel(page)).toBe('rgb(255, 255, 255)');
  // The values the chart uses are exactly the page tokens.
  expect(await root.getAttribute('data-chart-background')).toBe(await token('--color-surface'));
  expect(await root.getAttribute('data-chart-grid')).toBe(await token('--color-chart-grid'));

  await expect.poll(async () => root.getAttribute('data-chart-text')).toBe(await token('--color-text-muted'));
  expect(await root.getAttribute('data-chart-text')).not.toBe(darkText);

  // Up/down stay the green/red tokens (hue check: green channel dominates up, red channel dominates down).
  const lightUp = (await root.getAttribute('data-chart-up'))!;
  const lightDown = (await root.getAttribute('data-chart-down'))!;
  expect(lightUp).toBe(await token('--color-up'));
  expect(lightDown).toBe(await token('--color-down'));
  for (const up of [darkUp!, lightUp]) {
    const [r, g] = [parseInt(up.slice(1, 3), 16), parseInt(up.slice(3, 5), 16)];
    expect(g).toBeGreaterThan(r);
  }
  for (const down of [darkDown!, lightDown]) {
    const [r, g] = [parseInt(down.slice(1, 3), 16), parseInt(down.slice(3, 5), 16)];
    expect(r).toBeGreaterThan(g);
  }

  // And back to dark.
  await page.getByTestId('theme-toggle').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect.poll(() => paneBackgroundPixel(page)).toBe('rgb(22, 26, 32)');
  await expect.poll(async () => root.getAttribute('data-chart-text')).toBe(darkText);
});
