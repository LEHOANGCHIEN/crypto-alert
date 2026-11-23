import { test, expect } from '@playwright/test';
import { resetApp } from '../helpers/reset';

test.beforeEach(async ({ request }) => resetApp(request));

test('AC-THEME-01 dark theme by default', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  // token really applied: page background is the dark --color-bg (#0F1115)
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(15, 17, 21)');
});
