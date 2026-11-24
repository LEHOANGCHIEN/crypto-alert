import { test, expect } from '@playwright/test';
import { resetApp } from '../helpers/reset';
import { DEMO, EN, VI, loginViaUi } from '../helpers/auth';

test.beforeEach(async ({ request }) => resetApp(request));

test.use({ locale: 'en-US' }); // browser language is English, UI must still start in Vietnamese

test('AC-I18N-01 Vietnamese by default', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'vi');
  await expect(page.getByRole('link', { name: 'Đăng nhập' })).toBeVisible();
  await expect(page.getByTestId('footer-disclaimer')).toHaveText('Thông tin chỉ mang tính tham khảo, không phải khuyến nghị đầu tư.');
});

test('AC-I18N-03 error messages translated', async ({ page }) => {
  await page.goto('/login');
  await page.getByTestId('field-email').fill(DEMO.email);
  await page.getByTestId('field-password').fill('Wrong1234');
  await page.getByTestId('submit-login').click();
  await expect(page.getByTestId('form-error')).toHaveText(VI.INVALID_CREDENTIALS);
  await page.getByTestId('lang-en').click();
  await expect(page.getByTestId('form-error')).toHaveText(EN.INVALID_CREDENTIALS);
  await page.getByTestId('lang-vi').click();
  await expect(page.getByTestId('form-error')).toHaveText(VI.INVALID_CREDENTIALS);

  // an error code the frontend does not know → generic translated message
  await page.route('**/api/v1/auth/login', (route) =>
    route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ success: false, error: { code: 'SOMETHING_NEW' } }) }),
  );
  await page.getByTestId('field-password').fill('Wrong1234');
  await page.getByTestId('submit-login').click();
  await expect(page.getByTestId('form-error')).toHaveText(VI.UNKNOWN);
  await page.getByTestId('lang-en').click();
  await expect(page.getByTestId('form-error')).toHaveText(EN.UNKNOWN);
});

test('AC-I18N-05 language persists for guest and account', async ({ page, browser, baseURL }) => {
  // guest: choice survives a reload
  await page.goto('/');
  await page.getByTestId('lang-en').click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');

  // after login the account setting (vi) overrides the guest choice
  await loginViaUi(page);
  await expect(page.locator('html')).toHaveAttribute('lang', 'vi');

  // logged-in choice is saved to the account
  const saved = page.waitForResponse((r) => r.url().endsWith('/api/v1/users/me/settings') && r.request().method() === 'PATCH');
  await page.getByTestId('lang-en').click();
  expect((await saved).ok()).toBe(true);

  const other = await browser.newContext({ baseURL });
  try {
    const p2 = await other.newPage();
    await loginViaUi(p2);
    await expect(p2.locator('html')).toHaveAttribute('lang', 'en');
  } finally {
    await other.close();
  }
});
