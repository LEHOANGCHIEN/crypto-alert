import { test, expect } from '@playwright/test';
import { resetApp } from '../helpers/reset';
import { DEMO, VI, loginViaUi, logoutViaUi } from '../helpers/auth';

test.beforeEach(async ({ request }) => resetApp(request));

const NEW_PASSWORD = 'NewPassw0rd9';

test('AC-PROF-01 update display name', async ({ page }) => {
  await loginViaUi(page);
  await page.goto('/account');
  await expect(page.getByTestId('field-email')).toHaveValue(DEMO.email);
  await expect(page.getByTestId('field-email')).toHaveAttribute('readonly', '');
  await page.getByTestId('field-displayName').fill('Tên Mới');
  await page.getByTestId('save-profile').click();
  await expect(page.getByTestId('toast')).toHaveText('Đã lưu hồ sơ.');
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
  await expect(page.getByTestId('toast')).toHaveCount(0);
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
  await expect(page.getByTestId('toast')).toHaveText('Đã đổi mật khẩu.');
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
    await expect(page.getByTestId('toast')).toHaveText('Đã đổi mật khẩu.');
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
