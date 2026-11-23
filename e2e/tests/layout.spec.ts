import { test, expect } from '@playwright/test';
import { resetApp } from '../helpers/reset';

const TITLE = 'Xây dựng ứng dụng web theo dõi thị trường tiền mã hóa với biểu đồ kỹ thuật thời gian thực và cảnh báo giá';

test.beforeEach(async ({ request }) => resetApp(request));

test('AC-UI-03 footer shows exact title and disclaimer', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('footer-title')).toHaveText(TITLE);
  await expect(page.getByTestId('footer-disclaimer')).toHaveText('Thông tin chỉ mang tính tham khảo, không phải khuyến nghị đầu tư.');
  await expect(page.getByTestId('footer-course')).toHaveText('Đồ án chuyên ngành — UIT');

  await page.getByTestId('lang-en').click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByTestId('footer-title')).toHaveText(TITLE);
  await expect(page.getByTestId('footer-disclaimer')).toHaveText('Information is for reference only and is not investment advice.');
  await expect(page.getByTestId('footer-course')).toHaveText('Đồ án chuyên ngành — UIT');
});

test('AC-UI-04 unknown route shows 404', async ({ page }) => {
  await page.goto('/abc');
  await expect(page.getByTestId('page-not-found')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Không tìm thấy trang' })).toBeVisible();
  await page.getByRole('link', { name: 'Về trang chủ' }).click();
  await expect(page).toHaveURL(/\/trade\/BTCUSDT$/);
});
