import type { PriceDirection } from '../format';

const COLOR = { up: 'text-up', down: 'text-down', flat: 'text-text-muted' } as const;
const W = 120;
const H = 36;

/** Points of a sparkline scaled into a W×H box (pure, unit-tested). Empty or single-point input → no line. */
export function sparklinePoints(values: number[], width = W, height = H): string {
  if (values.length < 2) return '';
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  return values
    .map((v, i) => `${((i / (values.length - 1)) * width).toFixed(1)},${(height - ((v - min) / span) * (height - 2) - 1).toFixed(1)}`)
    .join(' ');
}

/** Tiny SVG line chart colored by its own direction (price direction colors only). */
export function Sparkline({ values, direction, testId }: { values: number[]; direction: PriceDirection; testId?: string }) {
  const points = sparklinePoints(values);
  if (!points) return null;
  return (
    <svg
      data-testid={testId}
      data-direction={direction}
      data-points={values.length}
      aria-hidden="true"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className={`h-9 w-full ${COLOR[direction]}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
      strokeLinecap="round"
    >
      <polyline points={points} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
