import { test, expect } from '@playwright/test';
import { resetApp } from '../../helpers/reset';
import { expectNoSiteOverflow } from '../../helpers/overflow';
import { viDateTime } from '../../helpers/alerts';

test.beforeEach(async ({ request }) => resetApp(request));

const REPO_URL = 'https://github.com/LEHOANGCHIEN/crypto-alert';

const PAGES = [
  { id: 'about', path: '/about', vi: 'Giới thiệu', en: 'About' },
  { id: 'faq', path: '/faq', vi: 'Câu hỏi thường gặp', en: 'Frequently asked questions' },
  { id: 'status', path: '/status', vi: 'Trạng thái hệ thống', en: 'System status' },
  { id: 'contact', path: '/contact', vi: 'Liên hệ', en: 'Contact' },
  { id: 'community-rules', path: '/community-rules', vi: 'Quy tắc cộng đồng', en: 'Community rules' },
  { id: 'terms', path: '/legal/terms', vi: 'Điều khoản sử dụng', en: 'Terms of use' },
  { id: 'privacy', path: '/legal/privacy', vi: 'Chính sách quyền riêng tư', en: 'Privacy policy' },
  { id: 'cookies', path: '/legal/cookies', vi: 'Chính sách cookie', en: 'Cookie policy' },
  { id: 'disclaimer', path: '/legal/disclaimer', vi: 'Miễn trừ trách nhiệm', en: 'Disclaimer' },
];

const VIETNAMESE = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
const RAW_KEY = /\b(static|footer|nav|home)\.[a-z-]+\.?[a-z0-9]*\b/;

type Health = { db: string; marketData: { provider: string; connected: boolean; lastMessageAt: string | null }; version: string };
const isHealth = (url: string) => /\/api\/v1\/health$/.test(new URL(url).pathname);

test('AC-SITE-03 static pages and live status', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });

  for (const p of PAGES) {
    // Vietnamese (default): breadcrumb (Home › title), translated h1, translated body, site footer.
    await page.goto(p.path);
    const root = page.getByTestId(`static-${p.id}`);
    await expect(root, p.path).toBeVisible();
    await expect(page.getByTestId('static-title')).toHaveText(p.vi);
    await expect(page.getByTestId('breadcrumb')).toContainText('Trang chủ');
    await expect(page.getByTestId('breadcrumb').locator('[aria-current="page"]')).toHaveText(p.vi);
    // Breadcrumb is readable: current item is aria-current, 15 px, weight 500, separator hidden from assistive tech.
    const current = page.getByTestId('breadcrumb').locator('[aria-current="page"]');
    await expect(current).toHaveCSS('font-size', '15px');
    await expect(current).toHaveCSS('font-weight', '500');
    await expect(page.getByTestId('breadcrumb').locator('[aria-hidden="true"]')).toHaveText('›');
    await expect(page.getByTestId('site-footer')).toBeVisible();
    await expect(page.getByTestId('pulse-bar')).toHaveCount(0);
    const viText = await root.innerText();
    expect(viText.length, p.path).toBeGreaterThan(150);
    expect(viText.toLowerCase()).not.toContain('lorem');
    expect(viText).not.toMatch(RAW_KEY);

    // English: translated h1 and body without any Vietnamese diacritics and without raw i18n keys.
    await page.getByTestId('lang-en').click();
    await expect(page.getByTestId('static-title')).toHaveText(p.en);
    await expect(page.getByTestId('breadcrumb')).toContainText('Home');
    const enText = await root.innerText();
    expect(enText, p.path).not.toMatch(VIETNAMESE);
    expect(enText).not.toMatch(RAW_KEY);
    await page.getByTestId('lang-vi').click();
    await expect(page.getByTestId('static-title')).toHaveText(p.vi);
  }

  // The FAQ lists question/answer pairs; /contact shows the project's GitHub repository link (no form).
  await page.goto('/faq');
  await expect(page.locator('[data-testid^="faq-item-"]')).toHaveCount(5);
  await page.goto('/contact');
  const repo = page.getByTestId('contact-repo-link');
  await expect(repo).toHaveAttribute('href', REPO_URL);
  await expect(repo).toHaveAttribute('target', '_blank');
  await expect(repo).toHaveAttribute('rel', 'noopener noreferrer');
  await expect(page.locator('form')).toHaveCount(0);

  // Phone (390×844): every static page is one column without horizontal scroll.
  await page.setViewportSize({ width: 390, height: 844 });
  for (const p of PAGES) {
    await page.goto(p.path);
    await expect(page.getByTestId(`static-${p.id}`), p.path).toBeVisible();
    await expectNoSiteOverflow(page, p.path);
  }
  await page.setViewportSize({ width: 1440, height: 900 });

  // /status shows the live values of GET /api/v1/health (the page's own response) in the user's timezone.
  await page.clock.install();
  const first = page.waitForResponse((r) => isHealth(r.url()));
  await page.goto('/status');
  const health = ((await (await first).json()) as { data: Health }).data;
  await expect(page.getByTestId('sys-db')).toHaveText(health.db === 'up' ? 'Hoạt động' : 'Không hoạt động');
  await expect(page.getByTestId('sys-provider')).toHaveText(health.marketData.provider);
  await expect(page.getByTestId('sys-connected')).toHaveText(health.marketData.connected ? 'Đã kết nối' : 'Mất kết nối');
  await expect(page.getByTestId('sys-last-message')).toHaveText(health.marketData.lastMessageAt ? viDateTime(health.marketData.lastMessageAt) : 'Chưa có');
  await expect(page.getByTestId('sys-version')).toHaveText(health.version);
  const firstUpdate = Number(await page.getByTestId('sys-updated').getAttribute('data-epoch'));

  // It refreshes every 30 s: nothing before, a new request right after the 30 s mark.
  await page.clock.fastForward(29_000);
  await expect(page.getByTestId('sys-updated')).toHaveAttribute('data-epoch', String(firstUpdate));
  const second = page.waitForResponse((r) => isHealth(r.url()));
  await page.clock.fastForward(2_000);
  await second;
  await expect.poll(async () => Number(await page.getByTestId('sys-updated').getAttribute('data-epoch'))).toBeGreaterThan(firstUpdate);
});
