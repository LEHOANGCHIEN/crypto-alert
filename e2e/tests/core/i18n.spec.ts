import { test, expect } from '@playwright/test';
import { resetApp } from '../../helpers/reset';
import { DEMO, EN, VI, loginViaUi } from '../../helpers/auth';

test.beforeEach(async ({ request }) => resetApp(request));

test.use({ locale: 'en-US' }); // browser language is English, UI must still start in Vietnamese

test('AC-I18N-01 Vietnamese by default', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'vi');
  await expect(page.locator('header').getByRole('link', { name: 'Đăng nhập' })).toBeVisible();
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
  // The app silently refreshes an expired token (JWT_ACCESS_TTL_SECONDS=5 in e2e) and resends: ignore the 401 and wait for the final response.
  const saved = page.waitForResponse((r) => r.url().endsWith('/api/v1/users/me/settings') && r.request().method() === 'PATCH' && r.status() !== 401);
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

test('AC-I18N-04 number and date formats follow locale', async ({ page }) => {
  await page.goto('/trade/BTCUSDT');
  await expect(page.getByTestId('chart-root')).toHaveAttribute('data-candle-count', '1000');
  const legendTime = async () => page.getByTestId('legend-time').textContent();
  const openTime = Number(await page.getByTestId('chart-legend').getAttribute('data-time'));

  // Vietnamese: dot thousands, comma decimals, dd/MM/yyyy HH:mm, "Tr" for millions.
  await expect(page.getByTestId('market-price-ETHUSDT')).toHaveText('3.510,25');
  await expect(page.getByTestId('market-change-ETHUSDT')).toHaveText('+3,24%');
  await expect(page.getByTestId('market-volume-BTCUSDT')).toHaveText(/^900\s?Tr$/);
  await expect(page.getByTestId('chart-price')).toHaveText(/^\d{1,3}(\.\d{3})*,\d{2}$/);
  expect(await legendTime()).toMatch(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/);

  // English: comma thousands, dot decimals, MM/dd/yyyy, h:mm AM/PM, "M" for millions.
  await page.getByTestId('lang-en').click();
  await expect(page.getByTestId('market-price-ETHUSDT')).toHaveText('3,510.25');
  await expect(page.getByTestId('market-change-ETHUSDT')).toHaveText('+3.24%');
  await expect(page.getByTestId('market-volume-BTCUSDT')).toHaveText('900M');
  await expect(page.getByTestId('chart-price')).toHaveText(/^\d{1,3}(,\d{3})*\.\d{2}$/);
  const en = (await legendTime())!;
  expect(en).toMatch(/^\d{2}\/\d{2}\/\d{4}, \d{1,2}:\d{2} (AM|PM)$/);
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit', hour: 'numeric', minute: '2-digit', hour12: true })
      .formatToParts(openTime)
      .map((x) => [x.type, x.value]),
  );
  expect(en).toBe(`${p.month}/${p.day}/${p.year}, ${p.hour}:${p.minute} ${p.dayPeriod}`);
});
