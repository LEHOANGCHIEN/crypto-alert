import { test, expect } from '@playwright/test';
import { resetApp } from '../helpers/reset';

test.beforeEach(async ({ request }) => resetApp(request));

test('AC-OPS-01 health reports db and market data', async ({ request }) => {
  const res = await request.get('/api/v1/health');
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.success).toBe(true);
  expect(body.data.db).toBe('up');
  expect(['binance', 'mock']).toContain(body.data.marketData.provider);
  expect(body.data.marketData.connected).toBe(true);
  expect(Date.now() - Date.parse(body.data.marketData.lastMessageAt)).toBeLessThan(60_000);
});
