import type { APIRequestContext } from '@playwright/test';

/** Truncate + reseed the DB and reset the mock provider (API.md §3.8). Call in beforeEach. */
export async function resetApp(request: APIRequestContext): Promise<void> {
  const res = await request.post('/api/v1/test/reset');
  if (!res.ok()) throw new Error(`test/reset failed: HTTP ${res.status()}`);
}
