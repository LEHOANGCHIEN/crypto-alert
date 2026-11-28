import { test, expect } from '@playwright/test';
import { resetApp } from '../../helpers/reset';
import { appToast } from '../../helpers/toast';
import { DEMO, VI, loginViaUi, logoutViaUi } from '../../helpers/auth';

test.beforeEach(async ({ request }) => resetApp(request));

const NEW_PASSWORD = 'NewPassw0rd9';

test('AC-PROF-01 update display name', async ({ page }) => {
  await loginViaUi(page);
  await page.goto('/account');
  await expect(page.getByTestId('field-email')).toHaveValue(DEMO.email);
  await expect(page.getByTestId('field-email')).toHaveAttribute('readonly', '');
  await page.getByTestId('field-displayName').fill('Tên Mới');
  await page.getByTestId('save-profile').click();
  await expect(appToast(page)).toHaveText('Đã lưu hồ sơ.');
  await expect(page.getByTestId('user-display-name')).toHaveText('Tên Mới');
  await page.reload();
  await expect(page.getByTestId('user-display-name')).toHaveText('Tên Mới');
});

test('AC-PROF-02 display name validation', async ({ page }) => {
  await loginViaUi(page);
  await page.goto('/account');
  await page.getByTestId('field-displayName').fill('A');
  await page.getByTestId('save-profile').click();
  await expect(page.getByTestId('error-displayName')).toHaveText('Phải có ít nhất 2 ký tự.');
  await page.getByTestId('field-displayName').fill('x'.repeat(51));
  await page.getByTestId('save-profile').click();
  await expect(page.getByTestId('error-displayName')).toHaveText('Không được vượt quá 50 ký tự.');
  await expect(appToast(page)).toHaveCount(0);
  await page.reload();
  await expect(page.getByTestId('user-display-name')).toHaveText(DEMO.displayName); // nothing saved
});

test('AC-PROF-03 change password', async ({ page }) => {
  await loginViaUi(page);
  await page.goto('/account');
  await page.getByTestId('field-currentPassword').fill('Wrong1234');
  await page.getByTestId('field-newPassword').fill(NEW_PASSWORD);
  await page.getByTestId('field-confirmPassword').last().fill(NEW_PASSWORD);
  await page.getByTestId('save-password').click();
  await expect(page.getByTestId('error-currentPassword')).toHaveText(VI.WRONG_CURRENT_PASSWORD);

  await page.getByTestId('field-currentPassword').fill(DEMO.password);
  await page.getByTestId('save-password').click();
  await expect(appToast(page)).toHaveText('Đã đổi mật khẩu.');
  await logoutViaUi(page);

  await page.goto('/login');
  await page.getByTestId('field-email').fill(DEMO.email);
  await page.getByTestId('field-password').fill(DEMO.password);
  await page.getByTestId('submit-login').click();
  await expect(page.getByTestId('form-error')).toHaveText(VI.INVALID_CREDENTIALS);
  await page.getByTestId('field-password').fill(NEW_PASSWORD);
  await page.getByTestId('submit-login').click();
  await expect(page.getByTestId('user-display-name')).toHaveText(DEMO.displayName);
});

test('AC-PROF-04 change password logs out other sessions', async ({ page, browser, baseURL }) => {
  const ctxB = await browser.newContext({ baseURL });
  const pageB = await ctxB.newPage();
  try {
    await loginViaUi(page);
    await loginViaUi(pageB);
    await page.goto('/account');
    await pageB.goto('/account');
    await expect(pageB.getByTestId('page-account')).toBeVisible();

    await page.getByTestId('field-currentPassword').fill(DEMO.password);
    await page.getByTestId('field-newPassword').fill(NEW_PASSWORD);
    await page.getByTestId('field-confirmPassword').last().fill(NEW_PASSWORD);
    await page.getByTestId('save-password').click();
    await expect(appToast(page)).toHaveText('Đã đổi mật khẩu.');
    await expect(page.getByTestId('user-display-name')).toHaveText(DEMO.displayName); // A stays logged in

    await pageB.waitForTimeout(6000); // B's access token (5 s) expires; its refresh token was revoked
    await pageB.getByTestId('field-displayName').fill('B Renamed');
    await pageB.getByTestId('save-profile').click(); // B's next authenticated action
    await expect(pageB).toHaveURL(/\/login$/);
    await expect(pageB.getByTestId('user-menu')).toHaveCount(0);

    await page.reload();
    await expect(page.getByTestId('user-display-name')).toHaveText(DEMO.displayName); // A still in
  } finally {
    await ctxB.close();
  }
});

test('AC-PROF-05 timezone setting changes displayed times', async ({ page }) => {
  const toMs = (s: string) => {
    const m = /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})$/.exec(s)!;
    return Date.UTC(+m[3], +m[2] - 1, +m[1], +m[4], +m[5]);
  };
  const legendNow = async (timezone: string) => {
    await expect(page.getByTestId('chart-root')).toHaveAttribute('data-candle-count', '1000');
    await expect(page.getByTestId('chart-root')).toHaveAttribute('data-timezone', timezone);
    const legend = page.getByTestId('chart-legend');
    return { openTime: await legend.getAttribute('data-time'), text: (await page.getByTestId('legend-time').textContent())! };
  };

  await loginViaUi(page); // demo user: Asia/Ho_Chi_Minh
  await page.goto('/trade/BTCUSDT');
  const before = await legendNow('Asia/Ho_Chi_Minh');

  await page.goto('/account');
  await expect(page.getByTestId('pref-timezone')).toHaveValue('Asia/Ho_Chi_Minh');
  await page.getByTestId('pref-timezone').selectOption('UTC');
  await page.getByTestId('save-preferences').click();
  await expect(appToast(page)).toBeVisible();

  await page.goto('/trade/BTCUSDT');
  const after = await legendNow('UTC');
  expect(after.openTime).toBe(before.openTime); // same candle
  expect(toMs(before.text) - toMs(after.text)).toBe(7 * 3_600_000); // UTC shows it 7 h earlier
  await expect(page.getByTestId('chart-root')).toHaveAttribute('data-timezone', 'UTC'); // time axis too
});
