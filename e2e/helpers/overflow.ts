import { expect, type Page } from '@playwright/test';

/**
 * Asserts there is no horizontal scroll, on the document AND on the `site-shell` (site pages scroll inside the shell,
 * so measuring only `documentElement` could never fail).
 */
export async function expectNoSiteOverflow(page: Page, label = ''): Promise<void> {
  await expect(page.getByTestId('site-shell'), label).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth), label)
    .toBeLessThanOrEqual(0);
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const shell = document.querySelector('[data-testid="site-shell"]') as HTMLElement;
          return shell.scrollWidth - shell.clientWidth;
        }),
      label,
    )
    .toBeLessThanOrEqual(0);
}
