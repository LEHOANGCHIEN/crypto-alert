import { useEffect, useRef, useState } from 'react';
import { AreaSeries, createChart, LineStyle, type IChartApi, type IPriceLine, type ISeriesApi, type TickMarkType, type Time, type UTCTimestamp } from 'lightweight-charts';
import type { Candle } from '../../shared/api/types';
import { useFormat } from '../../shared/format/useFormat';
import { useTheme } from '../../shared/theme/ThemeProvider';
import { chartThemeOptions, publishChartColors, readChartColors, type ChartColors } from '../chart';
import type { Range } from './lib/ranges';

export type Direction = 'up' | 'down' | 'flat';

type Props = { candles: Candle[]; range: Range; direction: Direction; precision: number };
type Tip = { x: number; time: number; price: number };

/** Up/down tokens by the range's change; a flat range uses the accent token (green/red only mean price direction). */
function seriesColors(direction: Direction, c: ChartColors) {
  if (direction === 'up') return { lineColor: c.up, topColor: c.upVolume, bottomColor: c.background };
  if (direction === 'down') return { lineColor: c.down, topColor: c.downVolume, bottomColor: c.background };
  return { lineColor: c.accent, topColor: c.accentSoft, bottomColor: c.accentClear };
}

/** Area chart of the close prices of one range with a dashed line at the first close and a crosshair tooltip (AC-COIN-02). */
export function RangeChart({ candles, range, direction, precision }: Props) {
  const fmt = useFormat();
  const { theme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Area'> | null>(null);
  const lineRef = useRef<IPriceLine | null>(null);
  const [tip, setTip] = useState<Tip | null>(null);

  // Create once; dispose on unmount. The attribution logo stays on.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const c = readChartColors();
    const base = chartThemeOptions(c);
    const chart = createChart(el, {
      autoSize: true,
      ...base,
      layout: { ...base.layout, attributionLogo: true, fontFamily: "'Roboto Mono', ui-monospace, monospace" },
      timeScale: { ...base.timeScale, timeVisible: true, secondsVisible: false },
    });
    const series = chart.addSeries(AreaSeries, { lineWidth: 2, priceLineVisible: false, lastValueVisible: false, ...seriesColors('flat', c) });
    chartRef.current = chart;
    seriesRef.current = series;
    chart.subscribeCrosshairMove((param) => {
      const point = param.point;
      const value = (param.seriesData.get(series) as { value?: number } | undefined)?.value;
      if (param.time === undefined || !point || value === undefined) setTip(null);
      else setTip({ x: point.x, time: (param.time as number) * 1000, price: value });
    });
    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      lineRef.current = null;
    };
  }, []);

  // Colors: tokens, by the direction of the range; re-applied when the theme is toggled.
  useEffect(() => {
    const chart = chartRef.current;
    const series = seriesRef.current;
    const el = containerRef.current;
    if (!chart || !series || !el) return;
    const c = readChartColors();
    chart.applyOptions(chartThemeOptions(c));
    series.applyOptions(seriesColors(direction, c));
    lineRef.current?.applyOptions({ color: c.text });
    publishChartColors(el, c);
    el.dataset.seriesColor = seriesColors(direction, c).lineColor;
  }, [theme, direction]);

  // Locale / timezone aware labels.
  useEffect(() => {
    if (containerRef.current) containerRef.current.dataset.timezone = fmt.timeZone;
    seriesRef.current?.applyOptions({ priceFormat: { type: 'price', precision, minMove: 1 / 10 ** precision } });
    chartRef.current?.applyOptions({
      localization: { priceFormatter: (p: number) => fmt.price(p, precision), timeFormatter: (t: number) => fmt.dateTime(t * 1000) },
      timeScale: { tickMarkFormatter: (time: Time, tickType: TickMarkType) => fmt.tickMark((time as number) * 1000, tickType) },
    });
  }, [precision, fmt]);

  // Data of the selected range + dashed line at its first close.
  useEffect(() => {
    const chart = chartRef.current;
    const series = seriesRef.current;
    const el = containerRef.current;
    if (!chart || !series || !el) return;
    series.setData(candles.map((k) => ({ time: Math.floor(k.openTime / 1000) as UTCTimestamp, value: k.close })));
    if (lineRef.current) series.removePriceLine(lineRef.current);
    lineRef.current = null;
    const first = candles[0];
    if (first) {
      lineRef.current = series.createPriceLine({ price: first.close, color: readChartColors().text, lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: false, title: '' });
    }
    chart.timeScale().fitContent();
    setTip(null);
    el.dataset.candleCount = String(candles.length);
    el.dataset.firstClose = first ? String(first.close) : '';
    el.dataset.lastClose = candles.length ? String(candles[candles.length - 1].close) : '';
  }, [candles]);

  return (
    <div className="absolute inset-0">
      <div ref={containerRef} data-testid="coin-chart" data-range={range} data-direction={direction} data-candle-count="0" className="absolute inset-0" />
      {tip && (
        <div
          data-testid="coin-tooltip"
          data-time={tip.time}
          data-price={tip.price}
          style={{ left: Math.max(8, tip.x - 70), top: 8 }}
          className="pointer-events-none absolute z-10 flex flex-col gap-0.5 rounded-input border border-border bg-surface px-2 py-1 font-mono text-meta"
        >
          <span className="text-text-muted">{fmt.dateTime(tip.time)}</span>
          <span className="text-body font-semibold text-text">{fmt.price(tip.price, precision)}</span>
        </div>
      )}
    </div>
  );
}
