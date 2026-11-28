import { expect, type Page } from '@playwright/test';
import type { Candle } from './market';

const KLINES = /\/api\/v1\/market\/klines\?/;

/** Opens a chart URL and waits until the candles the page received are drawn. Returns those candles. */
export async function openChart(page: Page, url = '/chart/BTCUSDT'): Promise<Candle[]> {
  const res = page.waitForResponse((r) => KLINES.test(r.url()));
  await page.goto(url);
  const candles = ((await (await res).json()) as { data: Candle[] }).data;
  await expect(page.getByTestId('chart-root')).toHaveAttribute('data-candle-count', String(candles.length));
  return candles;
}

/** Current value of a design token on <html> (e.g. `--color-ind-1`). */
export const cssVar = (page: Page, name: string): Promise<string> =>
  page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name);

/** Mean of the closes of the last `n` candles ending at index `end` (independent of the app code). */
export const meanClose = (candles: Candle[], n: number, end = candles.length - 1): number =>
  candles.slice(end - n + 1, end + 1).reduce((s, c) => s + c.close, 0) / n;

/** Moves the pointer over the candle with this open time (calibrated from two hover samples) and waits for the legend. */
export async function hoverCandle(page: Page, candles: Candle[], openTime: number): Promise<void> {
  const box = (await page.getByTestId('chart-root').boundingBox())!;
  const legend = page.getByTestId('chart-legend');
  // Pointer out first (legend back to the latest candle), then in: once `data-hovered` is true again, `data-time`
  // belongs to the new pointer position.
  const indexAt = async (x: number): Promise<number> => {
    await page.mouse.move(2, 2);
    await expect(legend).toHaveAttribute('data-hovered', 'false');
    await page.mouse.move(x, box.y + box.height * 0.3);
    await expect(legend).toHaveAttribute('data-hovered', 'true');
    const time = await legend.getAttribute('data-time');
    return candles.findIndex((c) => String(c.openTime) === time);
  };
  const target = candles.findIndex((c) => c.openTime === openTime);
  const x1 = box.x + box.width * 0.4;
  const x2 = box.x + box.width * 0.6;
  const [i1, i2] = [await indexAt(x1), await indexAt(x2)];
  const spacing = (x2 - x1) / (i2 - i1);
  let x = x2 + (target - i2) * spacing;
  for (let attempt = 0; attempt < 4; attempt++) {
    const i = await indexAt(x);
    if (i === target) return;
    x += (target - i) * spacing;
  }
  await expect(legend).toHaveAttribute('data-time', String(openTime));
}
