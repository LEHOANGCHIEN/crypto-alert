import { test, expect } from '@playwright/test';
import { resetApp } from '../helpers/reset';
import { cssVar, meanClose, openChart } from '../helpers/chart';
import { viPrice } from '../helpers/market';

test.beforeEach(async ({ request }) => resetApp(request));

test('AC-IND-01 default MA lines', async ({ page }) => {
  const candles = await openChart(page);
  const root = page.getByTestId('chart-root');

  // Three MA lines on the price pane (no oscillator pane by default), each with its own token color.
  await expect(root).toHaveAttribute('data-ma-series', '7,25,99');
  await expect(root).toHaveAttribute('data-panes', '1');
  const colors = [await cssVar(page, '--color-ind-1'), await cssVar(page, '--color-ind-2'), await cssVar(page, '--color-ind-3')];
  expect(new Set(colors).size).toBe(3);
  await expect(root).toHaveAttribute('data-ma-colors', colors.join(','));

  // A legend entry per line with its current value (latest candle while the pointer is away).
  for (const [slot, period] of [
    [1, 7],
    [2, 25],
    [3, 99],
  ]) {
    await expect(page.getByTestId(`legend-ma-${slot}-label`)).toHaveText(`MA(${period})`);
    await expect(page.getByTestId(`legend-ma-${slot}-value`)).toHaveText(viPrice(meanClose(candles, period)));
    const color = await page.getByTestId(`legend-ma-${slot}`).evaluate((el) => getComputedStyle(el).color);
    expect(color).toBe(await page.evaluate((c) => {
      const probe = document.createElement('span');
      probe.style.color = c;
      document.body.appendChild(probe);
      const v = getComputedStyle(probe).color;
      probe.remove();
      return v;
    }, colors[slot - 1]));
  }
});

test('AC-IND-02 toggle and change MA period persists', async ({ page }) => {
  const candles = await openChart(page);
  const root = page.getByTestId('chart-root');
  await page.getByTestId('indicators-button').click();

  // MA(25) off → its line and legend entry disappear.
  await page.getByTestId('ind-ma-2-toggle').uncheck();
  await expect(root).toHaveAttribute('data-ma-series', '7,99');
  await expect(page.getByTestId('legend-ma-2')).toHaveCount(0);

  // MA #1 period 50 → legend MA(50) with the new value, line redrawn with period 50.
  const period = page.getByTestId('ind-ma-1-period');
  await period.fill('50');
  await period.press('Enter');
  await expect(page.getByTestId('legend-ma-1-label')).toHaveText('MA(50)');
  await expect(root).toHaveAttribute('data-ma-series', '50,99');
  await expect(page.getByTestId('legend-ma-1-value')).toHaveText(viPrice(meanClose(candles, 50)));

  // Reload → settings kept (this browser's storage).
  const again = await openChart(page);
  await expect(root).toHaveAttribute('data-ma-series', '50,99');
  await expect(page.getByTestId('legend-ma-1-label')).toHaveText('MA(50)');
  await expect(page.getByTestId('legend-ma-1-value')).toHaveText(viPrice(meanClose(again, 50)));
  await expect(page.getByTestId('legend-ma-2')).toHaveCount(0);
  await page.getByTestId('indicators-button').click();
  await expect(page.getByTestId('ind-ma-1-period')).toHaveValue('50');
  await expect(page.getByTestId('ind-ma-2-toggle')).not.toBeChecked();
  await expect(page.getByTestId('ind-ma-3-toggle')).toBeChecked();
});

test('AC-IND-03 invalid period rejected', async ({ page }) => {
  await openChart(page);
  const root = page.getByTestId('chart-root');
  await page.getByTestId('indicators-button').click();
  const period = page.getByTestId('ind-ma-1-period');
  const error = page.getByTestId('ind-ma-1-error');

  for (const bad of ['1', '201', 'abc']) {
    await period.fill(bad);
    await period.press('Enter');
    await expect(error).toHaveText('Chu kỳ phải là số nguyên từ 2 đến 200.');
    // Previous value kept.
    await expect(period).toHaveValue('7');
    await expect(page.getByTestId('legend-ma-1-label')).toHaveText('MA(7)');
    await expect(root).toHaveAttribute('data-ma-series', '7,25,99');
  }

  await openChart(page);
  await expect(root).toHaveAttribute('data-ma-series', '7,25,99');
  await page.getByTestId('indicators-button').click();
  await expect(page.getByTestId('ind-ma-1-period')).toHaveValue('7');
  await expect(page.getByTestId('ind-ma-1-error')).toHaveCount(0);
});

test('AC-IND-04 RSI pane', async ({ page }) => {
  await openChart(page);
  const root = page.getByTestId('chart-root');
  await expect(root).toHaveAttribute('data-panes', '1');
  await expect(page.getByTestId('legend-rsi')).toHaveCount(0);

  await page.getByTestId('indicators-button').click();
  await page.getByTestId('ind-rsi-toggle').check();
  await expect(root).toHaveAttribute('data-panes', '2');
  await expect(root).toHaveAttribute('data-rsi-guides', '70,30');
  await expect(root).toHaveAttribute('data-rsi-guide-style', 'dashed');
  await expect(page.getByTestId('legend-rsi')).toContainText('RSI(14)');
  await expect(page.getByTestId('legend-rsi-value')).toHaveText(/^\d{1,3},\d{2}$/);

  await page.getByTestId('ind-rsi-toggle').uncheck();
  await expect(root).toHaveAttribute('data-panes', '1');
  await expect(root).toHaveAttribute('data-rsi-guides', '');
  await expect(page.getByTestId('legend-rsi')).toHaveCount(0);
});

test('AC-IND-05 MACD pane', async ({ page }) => {
  await openChart(page);
  const root = page.getByTestId('chart-root');
  await page.getByTestId('indicators-button').click();
  await page.getByTestId('ind-macd-toggle').check();
  await expect(root).toHaveAttribute('data-panes', '2');
  await expect(root).toHaveAttribute('data-macd-series', 'macd,signal,hist');

  // Legend shows MACD, signal and histogram values.
  const number = /^-?\d{1,3}(\.\d{3})*,\d{2}$/;
  for (const id of ['legend-macd-value', 'legend-macd-signal-value', 'legend-macd-hist-value']) await expect(page.getByTestId(id)).toHaveText(number);

  // Histogram: green (up token) when ≥ 0, red (down token) when < 0 — checked on the latest bar.
  const hist = page.getByTestId('legend-macd-hist-value');
  const sign = await hist.getAttribute('data-sign');
  const text = (await hist.textContent()) ?? '';
  expect(sign).toBe(text.startsWith('-') ? 'down' : 'up');
  await expect(root).toHaveAttribute('data-hist-last-color', await cssVar(page, sign === 'up' ? '--color-up' : '--color-down'));

  // With RSI too: three panes; then remove MACD → its pane is removed.
  await page.getByTestId('ind-rsi-toggle').check();
  await expect(root).toHaveAttribute('data-panes', '3');
  await page.getByTestId('ind-macd-toggle').uncheck();
  await expect(root).toHaveAttribute('data-panes', '2');
  await expect(root).toHaveAttribute('data-macd-series', '');
  await expect(page.getByTestId('legend-macd')).toHaveCount(0);
  await page.getByTestId('ind-rsi-toggle').uncheck();
  await expect(root).toHaveAttribute('data-panes', '1');
});
