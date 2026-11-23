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
