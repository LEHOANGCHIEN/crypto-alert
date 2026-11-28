import { test, expect } from '@playwright/test';
import { resetApp } from '../../helpers/reset';

test.beforeEach(async ({ request }) => resetApp(request));

test('AC-SITE-04 /trade redirects to /chart; shells never mix', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });

  // /trade/… redirects to /chart/… keeping the query string; the symbol is upper-cased.
  await page.goto('/trade/ETHUSDT?tf=4h');
  await expect(page).toHaveURL(/\/chart\/ETHUSDT\?tf=4h$/);
  await expect(page.getByTestId('chart-root')).toBeVisible();
  await page.goto('/chart/ethusdt');
  await expect(page).toHaveURL(/\/chart\/ETHUSDT$/);

  // Chart shell: compact chart header, pulse bar, status bar; never the site header or footer.
  await expect(page.getByTestId('chart-header')).toBeVisible();
  await expect(page.getByTestId('pulse-bar')).toBeVisible();
  await expect(page.getByTestId('status-bar')).toBeVisible();
  await expect(page.getByTestId('site-header')).toHaveCount(0);
  await expect(page.getByTestId('site-footer')).toHaveCount(0);

  // Site pages: site header + footer; never the pulse bar, the status bar or the chart header.
  for (const path of ['/', '/coin/BTCUSDT', '/login', '/abc']) {
    await page.goto(path);
    await expect(page.getByTestId('site-header'), path).toBeVisible();
    await expect(page.getByTestId('site-footer'), path).toBeVisible();
    await expect(page.getByTestId('pulse-bar'), path).toHaveCount(0);
    await expect(page.getByTestId('status-bar'), path).toHaveCount(0);
    await expect(page.getByTestId('chart-header'), path).toHaveCount(0);
  }

  // Back / forward between `/` and `/chart/BTCUSDT` keeps working.
  await page.goto('/');
  await page.getByTestId('nav-products').click();
  await page.getByTestId('nav-chart').click();
  await expect(page).toHaveURL(/\/chart\/BTCUSDT$/);
  await expect(page.getByTestId('chart-root')).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/:\/\/[^/]+\/$/);
  await expect(page.getByTestId('site-header')).toBeVisible();
  await page.goForward();
  await expect(page).toHaveURL(/\/chart\/BTCUSDT$/);
  await expect(page.getByTestId('chart-root')).toBeVisible();
  await expect(page.getByTestId('chart-header')).toBeVisible();
});
