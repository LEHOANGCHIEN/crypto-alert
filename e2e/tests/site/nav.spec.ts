import { test, expect, type Page } from '@playwright/test';
import { resetApp } from '../../helpers/reset';
import { DEMO } from '../../helpers/auth';
import { expectNoSiteOverflow } from '../../helpers/overflow';

test.beforeEach(async ({ request }) => resetApp(request));

/** Opens the "Products" mega-menu on a desktop site page and returns its panel. */
async function openProducts(page: Page) {
  await page.getByTestId('nav-products').click();
  const panel = page.getByTestId('nav-products-panel');
  await expect(panel).toBeVisible();
  return panel;
}

test('AC-UI-09 site header and mega-menu', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });

  // Site header (64 px): logo → `/`, search button, Products menu, language, theme, Login/Register.
  await page.goto('/');
  const header = page.getByTestId('site-header');
  await expect(header).toBeVisible();
  expect(Math.round((await header.boundingBox())!.height)).toBe(64);
  await expect(page.getByTestId('logo')).toHaveAttribute('href', '/');
  await expect(page.getByTestId('search-trigger')).toHaveText('Tìm kiếm (Ctrl+K)');
  await expect(page.getByTestId('lang-switcher')).toBeVisible();
  await expect(page.getByTestId('theme-toggle')).toBeVisible();
  await expect(header.getByRole('link', { name: 'Đăng nhập' })).toBeVisible();

  // Guest header on a phone (390×844): Login and Register stay visible and nothing overflows (site-shell included).
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(header.getByRole('link', { name: 'Đăng nhập' })).toBeVisible();
  await expect(header.getByRole('link', { name: 'Đăng ký' })).toBeVisible();
  await expectNoSiteOverflow(page, 'guest header at 390');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');

  // Mega-menu: only pages that exist; each item with icon + label + one-line description; Esc closes.
  const products = page.getByTestId('nav-products');
  await expect(products).not.toHaveAttribute('aria-current', 'page'); // home is not inside this section
  const panel = await openProducts(page);
  await expect(page.getByTestId('nav-chart-label')).toHaveText('Siêu biểu đồ');
  await expect(page.getByTestId('nav-overview-label')).toHaveText('Tổng quan coin');
  await expect(page.getByTestId('nav-alerts-label')).toHaveText('Cảnh báo giá');
  await expect(page.getByTestId('nav-notifications-label')).toHaveText('Thông báo');
  await expect(panel.locator('a')).toHaveCount(4);
  await expect(panel.locator('a svg')).toHaveCount(4);
  await expect(page.getByTestId('nav-chart')).toContainText('Biểu đồ nến toàn màn hình');
  await expect(page.getByTestId('nav-chart')).toHaveAttribute('href', '/chart/BTCUSDT');
  await expect(page.getByTestId('nav-overview')).toHaveAttribute('href', '/coin/BTCUSDT');
  await expect(page.getByTestId('nav-alerts')).toHaveAttribute('href', '/alerts');
  await expect(page.getByTestId('nav-notifications')).toHaveAttribute('href', '/notifications');
  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();
  // Keyboard reachable: focus the trigger, Enter opens the panel with focusable links.
  await products.focus();
  await page.keyboard.press('Enter');
  await expect(panel).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.getByTestId('nav-chart')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();
  // Hover opens it as well.
  await page.getByTestId('search-trigger').hover();
  await products.hover();
  await expect(panel).toBeVisible();

  // Last opened symbol: Supercharts and Coin overview follow it. Chart page → click ETHUSDT → back home via the logo.
  await page.goto('/chart/BTCUSDT');
  await expect(page.getByTestId('chart-root')).toHaveAttribute('data-candle-count', '1000');
  await page.getByTestId('market-row-ETHUSDT').click();
  await expect(page).toHaveURL(/\/chart\/ETHUSDT/);
  await page.getByTestId('logo').click();
  await expect(page).toHaveURL(/:\/\/[^/]+\/$/);
  await openProducts(page);
  await expect(page.getByTestId('nav-chart')).toHaveAttribute('href', '/chart/ETHUSDT');
  await expect(page.getByTestId('nav-overview')).toHaveAttribute('href', '/coin/ETHUSDT');

  // An unknown pair is not remembered.
  await page.goto('/chart/FAKEUSDT');
  await expect(page.getByTestId('chart-not-found')).toBeVisible();
  await page.getByTestId('logo').click();
  await openProducts(page);
  await expect(page.getByTestId('nav-chart')).toHaveAttribute('href', '/chart/ETHUSDT');

  // The memory survives a reload (localStorage).
  await page.reload();
  await openProducts(page);
  await expect(page.getByTestId('nav-overview')).toHaveAttribute('href', '/coin/ETHUSDT');

  // Guest: Notifications goes to /login; Alerts goes to /login and comes back after login (return-to).
  await page.getByTestId('nav-notifications').click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goBack();
  await openProducts(page);
  await page.getByTestId('nav-alerts').click();
  await expect(page).toHaveURL(/\/login$/);
  await page.getByTestId('field-email').fill(DEMO.email);
  await page.getByTestId('field-password').fill(DEMO.password);
  await page.getByTestId('submit-login').click();
  await expect(page).toHaveURL(/\/alerts$/);
  await expect(page.getByTestId('alerts-page')).toBeVisible();
  // Logged in: the header shows the notification bell and the user menu (instead of Login/Register).
  await expect(page.getByTestId('site-header').getByTestId('bell')).toBeVisible();
  await expect(page.getByTestId('site-header').getByTestId('user-menu')).toBeVisible();

  // The menu of the current section and the current item carry aria-current="page".
  await expect(page.getByTestId('nav-products')).toHaveAttribute('aria-current', 'page');
  await openProducts(page);
  await expect(page.getByTestId('nav-alerts')).toHaveAttribute('aria-current', 'page');
  for (const id of ['chart', 'overview', 'notifications']) {
    await expect(page.getByTestId(`nav-${id}`)).not.toHaveAttribute('aria-current', 'page');
  }
  await page.getByTestId('nav-notifications').click();
  await expect(page).toHaveURL(/\/notifications$/);
  await openProducts(page);
  await expect(page.getByTestId('nav-notifications')).toHaveAttribute('aria-current', 'page');
  await expect(page.getByTestId('nav-alerts')).not.toHaveAttribute('aria-current', 'page');

  await page.getByTestId('nav-chart').click();
  await expect(page).toHaveURL(/\/chart\/ETHUSDT$/);
  await expect(page.getByTestId('site-header')).toHaveCount(0); // the chart page uses the chart shell

  // Below 1024 px the menus move into a menu button (drawer).
  await page.goto('/coin/ETHUSDT');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByTestId('nav-main')).toHaveCount(0);
  await expect(page.getByTestId('nav-menu-button')).toBeVisible();
  await page.getByTestId('nav-menu-button').click();
  await expect(page.getByTestId('nav-main')).toBeVisible();
  await expect(page.getByTestId('nav-overview')).toHaveAttribute('aria-current', 'page');
  await page.getByTestId('nav-alerts').click();
  await expect(page).toHaveURL(/\/alerts$/);
  await expect(page.getByTestId('nav-main')).toHaveCount(0);
  await expectNoSiteOverflow(page, '/alerts at 390');
});
