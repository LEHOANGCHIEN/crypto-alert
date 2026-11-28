import { test, expect } from '@playwright/test';
import { resetApp } from '../../helpers/reset';

const TITLE = 'Xây dựng ứng dụng web theo dõi thị trường tiền mã hóa với biểu đồ kỹ thuật thời gian thực và cảnh báo giá';

const TITLE_EN = 'Building a Web Application for Cryptocurrency Market Tracking with Real-Time Technical Charts and Price Alerts';

test.beforeEach(async ({ request }) => resetApp(request));

test('AC-UI-03 site footer shows texts and every link opens an existing page', async ({ page }) => {
  await page.goto('/');
  const footer = page.getByTestId('site-footer');
  await expect(footer).toBeVisible();
  await expect(page.getByTestId('footer-title')).toHaveText(TITLE);
  await expect(page.getByTestId('footer-disclaimer')).toHaveText('Thông tin chỉ mang tính tham khảo, không phải khuyến nghị đầu tư.');
  await expect(page.getByTestId('footer-course')).toHaveText('Đồ án chuyên ngành — UIT');
  await expect(page.getByTestId('footer-attribution')).toContainText('Binance');
  await expect(page.getByTestId('footer-copyright')).toContainText(`© ${new Date().getFullYear()}`);
  await expect(page.getByTestId('footer-col-products')).toBeVisible();
  await expect(page.getByTestId('footer-close')).toHaveCount(0); // no close button any more

  await page.getByTestId('lang-en').click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByTestId('footer-title')).toHaveText(TITLE_EN);
  await expect(page.getByTestId('footer-disclaimer')).toHaveText('Information is for reference only and is not investment advice.');
  await expect(page.getByTestId('footer-course')).toHaveText('Specialized Project — UIT');
  await page.reload();
  await expect(page.getByTestId('footer-title')).toHaveText(TITLE_EN); // no hidden state to restore
  await expect(page.getByTestId('footer-close')).toHaveCount(0);

  // Owner's social links (one config file): 7 external links in `footer-social`, exactly the configured URLs.
  const SOCIAL = [
    ['facebook', 'Facebook', 'https://www.facebook.com/hoangchien.le.7777/'],
    ['github', 'GitHub', 'https://github.com/LEHOANGCHIEN'],
    ['linkedin', 'LinkedIn', 'https://www.linkedin.com/in/l%C3%AA-chi%E1%BA%BFn-b42a6522a/'],
    ['instagram', 'Instagram', 'https://www.instagram.com/le_hoang_chien/'],
    ['x', 'X', 'https://x.com/le_hoang_chienn'],
    ['reddit', 'Reddit', 'https://www.reddit.com/user/lehoangchien/'],
    ['threads', 'Threads', 'https://www.threads.com/@le_hoang_chien'],
  ] as const;
  const social = page.getByTestId('footer-social').locator('a');
  await expect(social).toHaveCount(7);
  for (const [id, label, url] of SOCIAL) {
    const link = page.getByTestId(`footer-social-${id}`);
    await expect(link).toHaveAttribute('href', url);
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    await expect(link).toHaveAttribute('aria-label', `${label} of Lê Hoàng Chiến`);
    const box = (await link.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(32);
    expect(box.height).toBeGreaterThanOrEqual(32);
  }
  await page.getByTestId('lang-vi').click();
  await expect(page.getByTestId('footer-social-github')).toHaveAttribute('aria-label', 'GitHub của Lê Hoàng Chiến');
  await page.getByTestId('lang-en').click();

  // /contact lists the same 7 links with icon + label.
  await page.goto('/contact');
  await expect(page.locator('[data-testid^="contact-social-"]')).toHaveCount(7);
  for (const [id, label, url] of SOCIAL) {
    const link = page.getByTestId(`contact-social-${id}`);
    await expect(link).toHaveAttribute('href', url);
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    await expect(link).toContainText(label);
  }
  await page.goto('/');

  // Every footer link: external ones open in a new tab with rel="noopener noreferrer"; internal ones are not 404.
  const links = await footer.locator('a').evaluateAll((els) =>
    els.map((a) => ({ href: a.getAttribute('href') ?? '', target: a.getAttribute('target'), rel: a.getAttribute('rel') })),
  );
  expect(links.length).toBeGreaterThanOrEqual(5);
  for (const l of links) {
    if (/^https?:/.test(l.href)) {
      expect(l.target, l.href).toBe('_blank');
      expect(l.rel, l.href).toBe('noopener noreferrer');
      continue;
    }
    await page.goto(l.href);
    if (l.href.startsWith('/chart/')) await expect(page.getByTestId('chart-root')).toBeVisible();
    else await expect(page.getByTestId('site-footer')).toBeVisible();
    await expect(page.getByTestId('page-not-found'), l.href).toHaveCount(0);
  }

  // The chart page has no site footer; its status bar carries the disclaimer.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/chart/BTCUSDT');
  await expect(page.getByTestId('status-bar')).toBeVisible();
  await expect(page.getByTestId('site-footer')).toHaveCount(0);
  await expect(page.getByTestId('statusbar-disclaimer')).toHaveText('Information is for reference only and is not investment advice.');
  // Phone (390×844): the status bar is hidden, so a compact disclaimer line sits above the tab bar; no horizontal scroll.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/chart/BTCUSDT');
  await expect(page.getByTestId('chart-disclaimer-mobile')).toBeVisible();
  await expect(page.getByTestId('chart-disclaimer-mobile')).toHaveText('Information is for reference only and is not investment advice.');
  await expect(page.getByTestId('status-bar')).toBeHidden();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
});
