import { test, expect } from '@playwright/test';
import { resetApp } from '../helpers/reset';
import { DEMO, NEW_USER, VI, loginViaUi, logoutViaUi, registerViaUi } from '../helpers/auth';

test.beforeEach(async ({ request }) => resetApp(request));

test('AC-AUTH-01 register success', async ({ page }) => {
  await registerViaUi(page);
  await expect(page).toHaveURL(/\/trade\/BTCUSDT$/);
  await expect(page.getByTestId('user-display-name')).toHaveText(NEW_USER.displayName);
  await expect(page.getByTestId('user-menu')).toBeVisible();
});

test('AC-AUTH-02 duplicate email rejected', async ({ page, request }) => {
  await registerViaUi(page, { email: 'DEMO@Example.com', displayName: 'Impostor', password: NEW_USER.password });
  await expect(page.getByTestId('form-error')).toHaveText(VI.EMAIL_TAKEN);
  await expect(page).toHaveURL(/\/register$/);
  // no account was created: the new password does not work for the existing demo account
  const res = await request.post('/api/v1/auth/login', { data: { email: DEMO.email, password: NEW_USER.password } });
  expect(res.status()).toBe(401);
});

test('AC-AUTH-03 register validation errors', async ({ page, request }) => {
  let registerCalls = 0;
  page.on('request', (r) => {
    if (r.url().includes('/api/v1/auth/register')) registerCalls++;
  });
  await page.goto('/register');
  await page.getByTestId('field-email').fill('nope');
  await page.getByTestId('field-displayName').fill('A');
  await page.getByTestId('field-password').fill('abcdefgh');
  await page.getByTestId('field-confirmPassword').fill('different1');
  // errors already show after leaving the fields, before any submit
  await expect(page.getByTestId('error-email')).toHaveText('Email không hợp lệ.');
  await expect(page.getByTestId('error-password')).toHaveText('Mật khẩu phải có ít nhất một chữ cái và một chữ số.');
  expect(registerCalls).toBe(0);
  await page.getByTestId('submit-register').click();
  await expect(page.getByTestId('error-email')).toHaveText('Email không hợp lệ.');
  await expect(page.getByTestId('error-displayName')).toHaveText('Phải có ít nhất 2 ký tự.');
  await expect(page.getByTestId('error-password')).toHaveText('Mật khẩu phải có ít nhất một chữ cái và một chữ số.');
  await expect(page.getByTestId('error-confirmPassword')).toHaveText('Mật khẩu xác nhận không khớp.');
  await page.waitForTimeout(300); // give a wrongly-sent request time to show up
  expect(registerCalls).toBe(0);

  // bypassing the client: the API enforces the same rules
  const res = await request.post('/api/v1/auth/register', { data: { email: 'nope', password: 'abcdefgh', displayName: 'A' } });
  expect(res.status()).toBe(400);
  const body = await res.json();
  expect(body.error.code).toBe('VALIDATION_ERROR');
  expect(body.error.details).toEqual(
    expect.arrayContaining([
      { field: 'email', code: 'INVALID_EMAIL' },
      { field: 'password', code: 'PASSWORD_WEAK' },
      { field: 'displayName', code: 'TOO_SHORT', params: { min: 2 } },
    ]),
  );
});

test('AC-AUTH-04 login success with return-to', async ({ page }) => {
  await loginViaUi(page);
  await expect(page).toHaveURL(/\/trade\/BTCUSDT$/); // default destination
  await expect(page.getByTestId('user-display-name')).toHaveText(DEMO.displayName);
  await logoutViaUi(page);
  await page.goto('/account'); // protected page → login → back to the page originally requested
  await expect(page).toHaveURL(/\/login$/);
  await page.getByTestId('field-email').fill(DEMO.email);
  await page.getByTestId('field-password').fill(DEMO.password);
  await page.getByTestId('submit-login').click();
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByTestId('user-display-name')).toHaveText(DEMO.displayName);
});

test('AC-AUTH-05 wrong credentials message', async ({ page }) => {
  await page.goto('/login');
  await page.getByTestId('field-email').fill(DEMO.email);
  await page.getByTestId('field-password').fill('Wrong1234');
  await page.getByTestId('submit-login').click();
  await expect(page.getByTestId('form-error')).toHaveText(VI.INVALID_CREDENTIALS);
  await expect(page.getByTestId('field-password')).toHaveValue('');

  await page.getByTestId('field-email').fill('ghost@example.com');
  await page.getByTestId('field-password').fill('Wrong1234');
  await page.getByTestId('submit-login').click();
  await expect(page.getByTestId('form-error')).toHaveText(VI.INVALID_CREDENTIALS);
  await expect(page.getByTestId('field-password')).toHaveValue('');
});

test('AC-AUTH-06 session survives reload and token expiry', async ({ page }) => {
  await loginViaUi(page);
  await page.reload();
  await expect(page.getByTestId('user-display-name')).toHaveText(DEMO.displayName); // no login screen
  await expect(page).toHaveURL(/\/trade\/BTCUSDT$/);

  await page.waitForTimeout(6000); // e2e access-token TTL is 5 s: the token is now expired
  await page.getByTestId('user-menu').click();
  await page.getByTestId('menu-account').click();
  await page.getByTestId('field-displayName').fill('Renamed User');
  await page.getByTestId('save-profile').click();
  await expect(page.getByTestId('toast')).toBeVisible(); // success without re-login (silent refresh)
  await expect(page.getByTestId('user-display-name')).toHaveText('Renamed User');
  await expect(page).toHaveURL(/\/account$/);
});

test('AC-AUTH-07 logout', async ({ page }) => {
  await loginViaUi(page);
  await logoutViaUi(page);
  await expect(page.getByTestId('user-menu')).toHaveCount(0);
  await page.goto('/account');
  await expect(page).toHaveURL(/\/login$/);
  await page.reload();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByTestId('user-menu')).toHaveCount(0);
  await expect(page.getByTestId('page-login')).toBeVisible();
});

test('AC-AUTH-08 protected route redirects to login', async ({ page }) => {
  await page.goto('/account');
  await expect(page).toHaveURL(/\/login$/);
  await page.getByTestId('field-email').fill(DEMO.email);
  await page.getByTestId('field-password').fill(DEMO.password);
  await page.getByTestId('submit-login').click();
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByTestId('page-account')).toBeVisible();
});

test('AC-AUTH-09 no password hash in responses', async ({ page }) => {
  const bodies: { url: string; method: string; text: Promise<string> }[] = [];
  page.on('response', (r) => {
    const u = r.url();
    if (/\/api\/v1\/(auth\/(register|login|refresh)|users\/me)/.test(u)) bodies.push({ url: u, method: r.request().method(), text: r.text() });
  });
  await registerViaUi(page); // register
  await expect(page.getByTestId('user-menu')).toBeVisible();
  await page.reload(); // refresh + GET /users/me
  await expect(page.getByTestId('user-menu')).toBeVisible();
  await page.getByTestId('user-menu').click();
  await page.getByTestId('menu-account').click();
  await page.getByTestId('field-displayName').fill('Changed Name');
  await page.getByTestId('save-profile').click(); // PATCH /users/me
  await expect(page.getByTestId('user-display-name')).toHaveText('Changed Name');
  await logoutViaUi(page);
  await loginViaUi(page, NEW_USER.email, NEW_USER.password); // login

  const seen = new Set<string>();
  for (const b of bodies) {
    const text = await b.text;
    expect(text.toLowerCase()).not.toContain('password');
    expect(text.toLowerCase()).not.toContain('hash');
    seen.add(`${b.method} ${new URL(b.url).pathname}`);
  }
  for (const k of ['POST /api/v1/auth/register', 'POST /api/v1/auth/login', 'POST /api/v1/auth/refresh', 'GET /api/v1/users/me', 'PATCH /api/v1/users/me']) {
    expect(seen).toContain(k);
  }
});

test('AC-AUTH-10 login rate limit', async ({ page }) => {
  await page.goto('/login');
  for (let i = 0; i < 6; i++) {
    await page.getByTestId('field-email').fill(DEMO.email);
    await page.getByTestId('field-password').fill(`Wrong123${i}`);
    await page.getByTestId('submit-login').click();
    if (i < 5) await expect(page.getByTestId('form-error')).toHaveText(VI.INVALID_CREDENTIALS);
  }
  await expect(page.getByTestId('form-error')).toHaveText(VI.RATE_LIMITED);
  // the correct password is refused as well while the window is active
  await page.getByTestId('field-email').fill(DEMO.email);
  await page.getByTestId('field-password').fill(DEMO.password);
  await page.getByTestId('submit-login').click();
  await expect(page.getByTestId('form-error')).toHaveText(VI.RATE_LIMITED);
  await expect(page.getByTestId('user-menu')).toHaveCount(0);
});
