import { test, expect } from '@playwright/test';
import { resetApp } from '../helpers/reset';
import { loginViaUi } from '../helpers/auth';

const TITLE = 'Xây dựng ứng dụng web theo dõi thị trường tiền mã hóa với biểu đồ kỹ thuật thời gian thực và cảnh báo giá';

const TITLE_EN = 'Building a Web Application for Cryptocurrency Market Tracking with Real-Time Technical Charts and Price Alerts';

test.beforeEach(async ({ request }) => resetApp(request));

test('AC-UI-03 footer shows translated texts and can be closed', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('footer-title')).toHaveText(TITLE);
  await expect(page.getByTestId('footer-disclaimer')).toHaveText('Thông tin chỉ mang tính tham khảo, không phải khuyến nghị đầu tư.');
  await expect(page.getByTestId('footer-course')).toHaveText('Đồ án chuyên ngành — UIT');

  await page.getByTestId('lang-en').click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByTestId('footer-title')).toHaveText(TITLE_EN);
  await expect(page.getByTestId('footer-disclaimer')).toHaveText('Information is for reference only and is not investment advice.');
  await expect(page.getByTestId('footer-course')).toHaveText('Specialized Project — UIT');

  await expect(page.getByTestId('footer-close')).toHaveAttribute('aria-label', 'Close footer');
  await page.getByTestId('footer-close').click();
  await expect(page.getByTestId('footer-title')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByTestId('footer-title')).toHaveCount(0);
  await expect(page.getByTestId('footer-close')).toHaveCount(0);
});

test('AC-UI-04 unknown route shows 404', async ({ page }) => {
  await page.goto('/abc');
  await expect(page.getByTestId('page-not-found')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Không tìm thấy trang' })).toBeVisible();
  await page.getByRole('link', { name: 'Về trang chủ' }).click();
  await expect(page).toHaveURL(/\/trade\/BTCUSDT$/);
});

test.describe('dashboard layout', () => {
  test('AC-UI-01 desktop three-column layout', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/trade/BTCUSDT');

    const market = page.getByTestId('panel-market');
    const chart = page.getByTestId('panel-chart');
    const side = page.getByTestId('panel-side');
    await expect(market).toBeVisible();
    await expect(chart).toBeVisible();
    await expect(side).toBeVisible();

    const m = (await market.boundingBox())!;
    const c = (await chart.boundingBox())!;
    const s = (await side.boundingBox())!;
    // Left → center → right, same row, widths 240 / flex / 320 (ARCHITECTURE §11.1).
    expect(m.x).toBeLessThan(c.x);
    expect(c.x).toBeLessThan(s.x);
    expect(Math.abs(m.y - c.y)).toBeLessThan(2);
    expect(Math.abs(c.y - s.y)).toBeLessThan(2);
    expect(Math.round(m.width)).toBe(240);
    expect(Math.round(s.width)).toBe(320);
    expect(c.width).toBeGreaterThan(m.width);

    // Right panel has Watchlist / Alerts tabs; no mobile tab bar on desktop.
    await expect(page.getByTestId('side-tab-watchlist')).toBeVisible();
    await expect(page.getByTestId('side-tab-alerts')).toBeVisible();
    await expect(page.getByTestId('mobile-tabs')).toBeHidden();

    // Header: logo, language switcher, theme toggle, login/register for a guest; footer visible.
    await expect(page.getByTestId('logo')).toBeVisible();
    await expect(page.getByTestId('lang-switcher')).toBeVisible();
    await expect(page.getByTestId('theme-toggle')).toBeVisible();
    await expect(page.locator('header').getByRole('link', { name: 'Đăng nhập' })).toBeVisible();
    await expect(page.locator('header').getByRole('link', { name: 'Đăng ký' })).toBeVisible();
    await expect(page.getByTestId('footer-title')).toBeVisible();

    // Logged in: the header also shows the notifications bell and the user menu (reviews/phase-2-ui-01-bell.decision.md).
    await expect(page.locator('header').getByTestId('bell')).toHaveCount(0);
    await loginViaUi(page);
    await expect(page).toHaveURL(/\/trade\/BTCUSDT/);
    await expect(page.locator('header').getByTestId('bell')).toBeVisible();
    await expect(page.locator('header').getByTestId('user-menu')).toBeVisible();
    await expect(page.getByTestId('panel-side')).toBeVisible();
  });

  test('AC-UI-02 mobile bottom tabs', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/trade/BTCUSDT');

    const tabs = page.getByTestId('mobile-tabs');
    await expect(tabs).toBeVisible();
    await expect(tabs.getByRole('button')).toHaveText(['Thị trường', 'Biểu đồ', 'Theo dõi', 'Cảnh báo']);

    const panels = { markets: 'panel-market', chart: 'panel-chart', watchlist: 'panel-side', alerts: 'panel-side' } as const;
    for (const tab of ['markets', 'chart', 'watchlist', 'alerts'] as const) {
      await page.getByTestId(`tab-${tab}`).click();
      for (const id of new Set(Object.values(panels))) {
        if (id === panels[tab]) await expect(page.getByTestId(id)).toBeVisible();
        else await expect(page.getByTestId(id)).toBeHidden();
      }
      if (tab === 'watchlist') await expect(page.getByTestId('side-content-watchlist')).toBeVisible();
      if (tab === 'alerts') await expect(page.getByTestId('side-content-alerts')).toBeVisible();
      // No horizontal page scroll in any tab.
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    }
    // Desktop side tabs are not shown on mobile.
    await expect(page.getByTestId('side-tab-watchlist')).toBeHidden();
  });
});
