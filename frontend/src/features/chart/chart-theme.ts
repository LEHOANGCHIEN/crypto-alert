/** Chart colors come from the design tokens (CSS variables), never from literals (CLAUDE.md rule 6). */
export type ChartColors = {
  background: string;
  text: string;
  grid: string;
  crosshair: string;
  border: string;
  up: string;
  down: string;
};

const cssVar = (name: string): string => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

export function readChartColors(): ChartColors {
  return {
    background: cssVar('--color-surface'),
    text: cssVar('--color-text-muted'),
    grid: cssVar('--color-chart-grid'),
    crosshair: cssVar('--color-chart-crosshair'),
    border: cssVar('--color-border'),
    up: cssVar('--color-up'),
    down: cssVar('--color-down'),
  };
}
