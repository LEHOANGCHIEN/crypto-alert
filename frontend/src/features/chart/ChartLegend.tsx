import { useTranslation } from 'react-i18next';
import type { Candle } from '../../shared/api/types';
import { useFormat } from '../../shared/format/useFormat';
import type { IndicatorData, IndicatorSettings } from '../indicators';
import { IndicatorLegend } from './IndicatorLegend';

type Props = {
  candle: Candle | undefined;
  /** index of `candle` in the loaded candles (indicator series use the same indices) */
  index: number;
  hovered: boolean;
  precision: number;
  indicators: IndicatorData | null;
  settings: IndicatorSettings;
};

/** Time + O/H/L/C and indicator values of the hovered candle, or of the latest candle when the pointer is away. */
export function ChartLegend({ candle, index, hovered, precision, indicators, settings }: Props) {
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
      className="pointer-events-none absolute left-2 top-2 z-10 flex flex-col gap-y-1 rounded-input bg-surface/80 px-2 py-1 font-mono text-meta tabular-nums"
    >
      <div className="flex flex-wrap gap-x-3 gap-y-1">
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
      {indicators && <IndicatorLegend data={indicators} index={index} settings={settings} precision={precision} />}
    </div>
  );
}
