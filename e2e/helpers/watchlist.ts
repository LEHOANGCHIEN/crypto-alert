import { expect, type Page } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

const TEST_DB = process.env.TEST_DATABASE_URL ?? 'postgresql://app:app@localhost:5432/crypto_alert_test';

/**
 * Inserts filler rows straight into the test DB so a user reaches the 50-item limit
 * (the mock only knows 8 USDT pairs, so 50 real pairs cannot be added through the API).
 */
export async function fillWatchlist(email: string, total: number): Promise<void> {
  const prisma = new PrismaClient({ datasources: { db: { url: TEST_DB } } });
  try {
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    const have = await prisma.watchlistItem.count({ where: { userId: user.id } });
    await prisma.watchlistItem.createMany({ data: Array.from({ length: total - have }, (_, i) => ({ userId: user.id, symbol: `FILL${i}USDT` })) });
  } finally {
    await prisma.$disconnect();
  }
}

/** Symbols in the watchlist panel, top to bottom. */
export const panelSymbols = (page: Page) =>
  page.locator('[data-testid^="watchlist-row-"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')!.replace('watchlist-row-', '')));

/** Clicks a star and waits for the PUT/DELETE to be answered. */
export async function clickStar(page: Page, testId: string, method: 'PUT' | 'DELETE'): Promise<void> {
  const done = page.waitForResponse((r) => r.request().method() === method && /\/api\/v1\/watchlist\//.test(r.url()));
  await page.getByTestId(testId).click();
  expect((await done).ok()).toBe(true);
}
