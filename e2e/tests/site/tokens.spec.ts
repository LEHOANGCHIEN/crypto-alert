import { expect, test } from '@playwright/test';
import { resetApp } from '../../helpers/reset';
import { cssVar } from '../../helpers/chart';

/** `#rgb` / `#rrggbb` → [r, g, b] (the CSS minifier may shorten `#000000` to `#000`). */
function parseHex(value: string): [number, number, number] {
  let h = value.trim().replace('#', '');
  if (h.length === 3) h = [...h].map((c) => c + c).join('');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/** WCAG 2.x relative luminance. */
function luminance([r, g, b]: [number, number, number]): number {
  const lin = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrast(a: string, b: string): number {
  const la = luminance(parseHex(a));
  const lb = luminance(parseHex(b));
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

const TEXT = ['--color-text', '--color-text-muted', '--color-text-faint'];
const SURFACES = ['--color-bg', '--color-surface', '--color-surface-2'];

test('AC-SITE-05 dark theme is black and text tokens keep 4.5:1 contrast in both themes', async ({ page, request }) => {
  await resetApp(request);
  await page.goto('/login');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

  const check = async (): Promise<void> => {
    for (const t of TEXT) {
      for (const s of SURFACES) {
        const ratio = contrast(await cssVar(page, t), await cssVar(page, s));
        expect(ratio, `${t} on ${s}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  };

  // Dark: pure black page background, really applied to the page.
  expect(parseHex(await cssVar(page, '--color-bg'))).toEqual([0, 0, 0]);
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(0, 0, 0)');
  await check();

  // Light: same check after the toggle.
  await page.getByTestId('theme-toggle').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await check();
});
