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
