import { test, expect } from '@playwright/test';
import { resetApp } from '../helpers/reset';
import { DEMO } from '../helpers/auth';

test.beforeEach(async ({ request }) => resetApp(request));

test('AC-UI-09 header navigation', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/trade/BTCUSDT');
  await expect(page.getByTestId('chart-root')).toHaveAttribute('data-candle-count', '1000');

  // Default last symbol = BTCUSDT; the link of the current page is highlighted.
  const nav = page.getByTestId('nav-main');
  await expect(nav.getByTestId('nav-chart')).toHaveText('Biểu đồ');
  await expect(nav.getByTestId('nav-overview')).toHaveText('Tổng quan');
  await expect(nav.getByTestId('nav-alerts')).toHaveText('Cảnh báo');
  await expect(nav.getByTestId('nav-notifications')).toHaveText('Thông báo');
  await expect(page.getByTestId('nav-chart')).toHaveAttribute('href', '/trade/BTCUSDT');
  await expect(page.getByTestId('nav-overview')).toHaveAttribute('href', '/coin/BTCUSDT');
  await expect(page.getByTestId('nav-alerts')).toHaveAttribute('href', '/alerts');
  await expect(page.getByTestId('nav-notifications')).toHaveAttribute('href', '/notifications');
  await expect(page.getByTestId('nav-chart')).toHaveAttribute('aria-current', 'page');
  for (const id of ['overview', 'alerts', 'notifications']) {
    await expect(page.getByTestId(`nav-${id}`)).not.toHaveAttribute('aria-current', 'page');
  }

  // Last opened symbol: Chart and Overview follow it.
  await page.getByTestId('market-row-ETHUSDT').click();
  await expect(page).toHaveURL(/\/trade\/ETHUSDT/);
  await expect(page.getByTestId('nav-chart')).toHaveAttribute('href', '/trade/ETHUSDT');
  await expect(page.getByTestId('nav-overview')).toHaveAttribute('href', '/coin/ETHUSDT');

  // An unknown pair is not remembered.
  await page.goto('/trade/FAKEUSDT');
  await expect(page.getByTestId('chart-not-found')).toBeVisible();
  await expect(page.getByTestId('nav-chart')).toHaveAttribute('href', '/trade/ETHUSDT');

  // The memory survives a reload (localStorage).
  await page.reload();
  await expect(page.getByTestId('nav-overview')).toHaveAttribute('href', '/coin/ETHUSDT');

  // Guest: Alerts goes to /login and comes back after login (return-to).
  await page.getByTestId('nav-alerts').click();
  await expect(page).toHaveURL(/\/login$/);
  await page.getByTestId('field-email').fill(DEMO.email);
  await page.getByTestId('field-password').fill(DEMO.password);
  await page.getByTestId('submit-login').click();
  await expect(page).toHaveURL(/\/alerts$/);
  await expect(page.getByTestId('alerts-page')).toBeVisible();
  await expect(page.getByTestId('nav-alerts')).toHaveAttribute('aria-current', 'page');
  await expect(page.getByTestId('nav-chart')).not.toHaveAttribute('aria-current', 'page');

  await page.getByTestId('nav-notifications').click();
  await expect(page).toHaveURL(/\/notifications$/);
  await expect(page.getByTestId('nav-notifications')).toHaveAttribute('aria-current', 'page');
  await expect(page.getByTestId('nav-alerts')).not.toHaveAttribute('aria-current', 'page');

  await page.getByTestId('nav-chart').click();
  await expect(page).toHaveURL(/\/trade\/ETHUSDT$/);
  await expect(page.getByTestId('nav-chart')).toHaveAttribute('aria-current', 'page');

  // Below 1024 px the links move into a menu button.
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByTestId('nav-main')).toHaveCount(0);
  await expect(page.getByTestId('nav-menu-button')).toBeVisible();
  await page.getByTestId('nav-menu-button').click();
  await expect(page.getByTestId('nav-main')).toBeVisible();
  await expect(page.getByTestId('nav-chart')).toHaveAttribute('aria-current', 'page');
  await page.getByTestId('nav-alerts').click();
  await expect(page).toHaveURL(/\/alerts$/);
  await expect(page.getByTestId('nav-main')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
