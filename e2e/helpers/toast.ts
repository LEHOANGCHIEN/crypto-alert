import type { Locator, Page } from '@playwright/test';

/**
 * Toasts other than alert notifications. Logging in as the seeded demo user (1 unread notification) also shows the
 * unread-summary notification toast (AC-NOTIF-04), so assertions about other toasts exclude `data-kind="notification"`.
 */
export const appToast = (page: Page): Locator => page.locator('[data-testid="toast"]:not([data-kind="notification"])');

/** Alert notification toasts (notification:new and the unread summary). */
export const notificationToast = (page: Page): Locator => page.locator('[data-testid="toast"][data-kind="notification"]');
