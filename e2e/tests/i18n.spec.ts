import { test, expect } from '@playwright/test';
import { resetApp } from '../helpers/reset';

test.beforeEach(async ({ request }) => resetApp(request));

test.use({ locale: 'en-US' }); // browser language is English, UI must still start in Vietnamese

test('AC-I18N-01 Vietnamese by default', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'vi');
  await expect(page.getByRole('link', { name: 'Đăng nhập' })).toBeVisible();
  await expect(page.getByTestId('footer-disclaimer')).toHaveText('Thông tin chỉ mang tính tham khảo, không phải khuyến nghị đầu tư.');
});
