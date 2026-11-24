import { expect, type Page } from '@playwright/test';

export const DEMO = { email: 'demo@example.com', password: 'Demo@123456', displayName: 'Demo User' };
export const NEW_USER = { email: 'new.user@example.com', displayName: 'New User', password: 'Passw0rdX1' };

/** Logs in through the login form and waits until the header shows the user menu. */
export async function loginViaUi(page: Page, email = DEMO.email, password = DEMO.password): Promise<void> {
  await page.goto('/login');
  await page.getByTestId('field-email').fill(email);
  await page.getByTestId('field-password').fill(password);
  await page.getByTestId('submit-login').click();
  await expect(page.getByTestId('user-menu')).toBeVisible();
}

export async function registerViaUi(page: Page, u = NEW_USER): Promise<void> {
  await page.goto('/register');
  await page.getByTestId('field-email').fill(u.email);
  await page.getByTestId('field-displayName').fill(u.displayName);
  await page.getByTestId('field-password').fill(u.password);
  await page.getByTestId('field-confirmPassword').fill(u.password);
  await page.getByTestId('submit-register').click();
}

export async function logoutViaUi(page: Page): Promise<void> {
  await page.getByTestId('user-menu').click();
  await page.getByTestId('menu-logout').click();
  await expect(page.locator('header').getByRole('link', { name: 'Đăng nhập' }).or(page.locator('header').getByRole('link', { name: 'Log in' }))).toBeVisible();
}

export const VI = {
  EMAIL_TAKEN: 'Email này đã được đăng ký.',
  INVALID_CREDENTIALS: 'Email hoặc mật khẩu không đúng.',
  RATE_LIMITED: 'Bạn thao tác quá nhanh, vui lòng thử lại sau ít phút.',
  WRONG_CURRENT_PASSWORD: 'Mật khẩu hiện tại không đúng.',
  UNKNOWN: 'Đã có lỗi xảy ra, vui lòng thử lại.',
};
export const EN = {
  INVALID_CREDENTIALS: 'Incorrect email or password.',
  UNKNOWN: 'Something went wrong, please try again.',
};
