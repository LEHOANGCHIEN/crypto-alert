import { useTranslation } from 'react-i18next';
import type { Candle } from '../../shared/api/types';
import { useFormat } from '../../shared/format/useFormat';

/** Time + O/H/L/C of the hovered candle, or of the latest candle when the pointer is away. */
export function ChartLegend({ candle, hovered, precision }: { candle: Candle | undefined; hovered: boolean; precision: number }) {
  const { t } = useTranslation();
  const fmt = useFormat();
  if (!candle) return null;
  const items = [
    ['open', candle.open],
    ['high', candle.high],
    ['low', candle.low],
    ['close', candle.close],
  ] as const;
  return (
    <div
      data-testid="chart-legend"
      data-time={candle.openTime}
      data-hovered={hovered}
      className="pointer-events-none absolute left-2 top-2 z-10 flex flex-wrap gap-x-3 gap-y-1 rounded-input bg-surface/80 px-2 py-1 text-meta"
    >
      <span data-testid="legend-time" className="text-text-muted">
        {fmt.dateTime(candle.openTime)}
      </span>
      {items.map(([key, value]) => (
        <span key={key} className="text-text">
          <span className="text-text-muted">{t(`chart.legend.${key}`)} </span>
          <span data-testid={`legend-${key}`}>{fmt.price(value, precision)}</span>
        </span>
      ))}
    </div>
  );
}
