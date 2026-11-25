import { expect, type APIRequestContext, type Page } from '@playwright/test';
import { DEMO } from './auth';

/** Alert / notification helpers (API.md §3.5, §3.6, §3.8). */
export type Alert = { id: number; symbol: string; condition: 'ABOVE' | 'BELOW'; targetPrice: number; status: string; triggeredPrice: number | null; createdAt: string; triggeredAt: string | null };
export type Notification = {
  id: number;
  payload: { alertId: number; symbol: string; condition: 'ABOVE' | 'BELOW'; targetPrice: number; triggeredPrice: number };
  readAt: string | null;
  createdAt: string;
};

async function data<T>(res: Awaited<ReturnType<APIRequestContext['post']>>): Promise<T> {
  if (!res.ok()) throw new Error(`${res.url()} → HTTP ${res.status()} ${await res.text()}`);
  return ((await res.json()) as { data: T }).data;
}
const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

/** Logs in through the API (counts toward the login rate limit of 5/min, reset by /test/reset). */
export const apiLogin = async (request: APIRequestContext, email = DEMO.email, password = DEMO.password): Promise<string> =>
  (await data<{ accessToken: string }>(await request.post('/api/v1/auth/login', { data: { email, password } }))).accessToken;

/**
 * API access token that stays valid although the e2e access-token TTL is 5 s: logs in once, then renews it through
 * POST /auth/refresh (refresh cookie kept by this request context; refresh does not count toward the login rate limit).
 */
export function apiSession(request: APIRequestContext, email = DEMO.email, password = DEMO.password): () => Promise<string> {
  let token: string | null = null;
  let at = 0;
  return async () => {
    if (token && Date.now() - at < 3000) return token;
    token = token
      ? (await data<{ accessToken: string }>(await request.post('/api/v1/auth/refresh'))).accessToken
      : await apiLogin(request, email, password);
    at = Date.now();
    return token;
  };
}

export const apiCreateAlert = async (request: APIRequestContext, token: string, symbol: string, condition: 'ABOVE' | 'BELOW', targetPrice: number): Promise<Alert> =>
  data(await request.post('/api/v1/alerts', { headers: bearer(token), data: { symbol, condition, targetPrice } }));

export const apiAlerts = async (request: APIRequestContext, token: string): Promise<Alert[]> => data(await request.get('/api/v1/alerts', { headers: bearer(token) }));

export const apiNotifications = async (request: APIRequestContext, token: string): Promise<{ items: Notification[]; unreadCount: number }> =>
  data(await request.get('/api/v1/notifications', { headers: bearer(token) }));

export const apiDeleteAlert = (request: APIRequestContext, token: string, id: number) => request.delete(`/api/v1/alerts/${id}`, { headers: bearer(token) });

export const apiMarkRead = async (request: APIRequestContext, token: string, id: number): Promise<void> => {
  await data(await request.post(`/api/v1/notifications/${id}/read`, { headers: bearer(token) }));
};

export const workerReload = async (request: APIRequestContext): Promise<number> =>
  (await data<{ activeAlerts: number }>(await request.post('/api/v1/test/worker/reload'))).activeAlerts;

export const pricePrecision = async (request: APIRequestContext, symbol: string): Promise<number> =>
  ((await data<{ symbol: string; pricePrecision: number }[]>(await request.get('/api/v1/market/symbols'))).find((s) => s.symbol === symbol) as { pricePrecision: number }).pricePrecision;

/** Rounds to `d` decimals (no float tails like 91234.56999999). */
export const round = (v: number, d = 2): number => Number(v.toFixed(d));

export const enPrice = (v: number, d = 2): string => new Intl.NumberFormat('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }).format(v);

/** Same format as the app for vi: "21/11/2026 14:05" in Asia/Ho_Chi_Minh (AC-I18N-04). */
export function viDateTime(iso: string, timeZone = 'Asia/Ho_Chi_Minh'): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(Date.parse(iso))
      .map((p) => [p.type, p.value]),
  );
  return `${parts.day}/${parts.month}/${parts.year} ${parts.hour}:${parts.minute}`;
}

/** Opens the Alerts tab of the right panel (logged-in user) and waits for the form and the lists. */
export async function openAlertsTab(page: Page, url?: string): Promise<void> {
  if (url) await page.goto(url);
  await page.getByTestId('side-tab-alerts').click();
  await expect(page.getByTestId('alert-form')).toBeVisible();
  await expect(page.getByTestId('alerts-loading')).toHaveCount(0);
}

/** Fills and submits the alert form; resolves with the created alert (201). */
export async function createAlertViaUi(page: Page, condition: 'ABOVE' | 'BELOW', target: number, symbol?: string): Promise<Alert> {
  if (symbol) await page.getByTestId('alert-symbol').selectOption(symbol);
  await page.getByTestId('alert-condition').selectOption(condition);
  await page.getByTestId('field-targetPrice').fill(String(target));
  const created = page.waitForResponse((r) => r.url().endsWith('/api/v1/alerts') && r.request().method() === 'POST');
  await page.getByTestId('alert-submit').click();
  const res = await created;
  expect(res.status()).toBe(201);
  const alert = ((await res.json()) as { data: Alert }).data;
  await expect(page.getByTestId('alerts-active').getByTestId(`alert-row-${alert.id}`)).toBeVisible();
  return alert;
}

/**
 * Records the text of every toast ever shown in the page (toasts disappear after 5 s), so a test can prove that a
 * toast was NOT shown. Call before the first navigation.
 */
export async function recordToasts(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const w = window as unknown as { __toasts: string[] };
    w.__toasts = [];
    new MutationObserver((records) => {
      for (const r of records)
        for (const node of r.addedNodes)
          if (node instanceof HTMLElement && node.dataset.testid === 'toast') w.__toasts.push(node.textContent ?? '');
    }).observe(document, { childList: true, subtree: true });
  });
}

export const shownToasts = (page: Page): Promise<string[]> => page.evaluate(() => (window as unknown as { __toasts: string[] }).__toasts);
