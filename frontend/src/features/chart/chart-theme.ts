/** Chart colors come from the design tokens (CSS variables), never from literals (CLAUDE.md rule 6). */
export type ChartColors = {
  background: string;
  text: string;
  grid: string;
  crosshair: string;
  border: string;
  up: string;
  down: string;
  accent: string;
  upVolume: string;
  downVolume: string;
  accentSoft: string;
  accentClear: string;
  ma: string[];
  rsi: string;
  macd: string;
  signal: string;
};

const cssVar = (name: string): string => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

export function readChartColors(): ChartColors {
  return {
    background: cssVar('--color-bg'),
    text: cssVar('--color-text-muted'),
    grid: cssVar('--color-chart-grid'),
    crosshair: cssVar('--color-chart-crosshair'),
    border: cssVar('--color-border'),
    up: cssVar('--color-up'),
    down: cssVar('--color-down'),
    accent: cssVar('--color-accent'),
    upVolume: cssVar('--color-up-volume'),
    downVolume: cssVar('--color-down-volume'),
    accentSoft: cssVar('--color-accent-soft'),
    accentClear: cssVar('--color-accent-clear'),
    ma: [cssVar('--color-ind-1'), cssVar('--color-ind-2'), cssVar('--color-ind-3')],
    rsi: cssVar('--color-ind-rsi'),
    macd: cssVar('--color-ind-macd'),
    signal: cssVar('--color-ind-signal'),
  };
}

/** Options that depend on the theme; used both at creation and when the theme changes. */
export function chartThemeOptions(c: ChartColors) {
  return {
    layout: { background: { color: c.background }, textColor: c.text, panes: { separatorColor: c.border, separatorHoverColor: c.grid } },
    grid: { vertLines: { color: c.grid }, horzLines: { color: c.grid } },
    crosshair: { vertLine: { color: c.crosshair }, horzLine: { color: c.crosshair } },
    rightPriceScale: { borderColor: c.border },
    timeScale: { borderColor: c.border },
  };
}

export function candleThemeOptions(c: ChartColors) {
  return { upColor: c.up, downColor: c.down, wickUpColor: c.up, wickDownColor: c.down };
}

/** Exposes the applied colors for end-to-end tests (the chart itself is a canvas). */
export function publishChartColors(el: HTMLElement, c: ChartColors): void {
  el.dataset.chartBackground = c.background;
  el.dataset.chartText = c.text;
  el.dataset.chartGrid = c.grid;
  el.dataset.chartUp = c.up;
  el.dataset.chartDown = c.down;
}
