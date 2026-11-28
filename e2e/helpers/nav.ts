import { expect, type Page } from '@playwright/test';

/** Opens the "Products" mega-menu in the site header (desktop) so its items can be clicked or inspected. */
export async function openProductsMenu(page: Page): Promise<void> {
  await page.getByTestId('nav-products').click();
  await expect(page.getByTestId('nav-products-panel')).toBeVisible();
}
