import { useEffect, useRef } from 'react';
import {
  CandlestickSeries,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type TickMarkType,
  type Time,
  type UTCTimestamp,
} from 'lightweight-charts';
import type { Candle } from '../../shared/api/types';
import { liveChangedIndices } from '../../shared/market/live';
import { useFormat } from '../../shared/format/useFormat';
import { useTheme } from '../../shared/theme/ThemeProvider';
import { candleThemeOptions, chartThemeOptions, publishChartColors, readChartColors } from './chart-theme';

type Props = {
  candles: Candle[];
  precision: number;
  tickSize: number;
  /** open time (epoch ms) of the candle under the crosshair, null when the pointer leaves the chart */
  onHover: (openTime: number | null) => void;
  /** `SYMBOL:interval` while live updates are subscribed (test hook `data-live`), '' otherwise */
  liveKey: string;
};

const toBar = (k: Candle): CandlestickData<UTCTimestamp> => ({
  time: Math.floor(k.openTime / 1000) as UTCTimestamp,
  open: k.open,
  high: k.high,
  low: k.low,
  close: k.close,
});

const VISIBLE_BARS = 120;

/** Lightweight Charts v5 candlestick chart. Times are UTC seconds; display timezone is applied by the formatters. */
export function CandleChart({ candles, precision, tickSize, onHover, liveKey }: Props) {
  const fmt = useFormat();
  const { theme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const shownRef = useRef<Candle[]>([]);
  const hoverRef = useRef(onHover);
  useEffect(() => {
    hoverRef.current = onHover;
  }, [onHover]);

  // Create once; dispose on unmount.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const c = readChartColors();
    const chart = createChart(el, {
      autoSize: true,
      ...chartThemeOptions(c),
      layout: { ...chartThemeOptions(c).layout, attributionLogo: true, fontFamily: 'Inter, system-ui, sans-serif' },
      timeScale: { ...chartThemeOptions(c).timeScale, timeVisible: true, secondsVisible: false },
    });
    const series = chart.addSeries(CandlestickSeries, { ...candleThemeOptions(c), borderVisible: false });
    publishChartColors(el, c);
    chart.subscribeCrosshairMove((param) => {
      hoverRef.current(param.time === undefined ? null : (param.time as number) * 1000);
    });
    chartRef.current = chart;
    seriesRef.current = series;
    shownRef.current = []; // a new chart has no data yet: the data effect must call setData
    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      shownRef.current = [];
    };
  }, []);

  // Re-apply token colors when the theme is toggled (no reload; candle colors stay the up/down tokens).
  useEffect(() => {
    const chart = chartRef.current;
    const series = seriesRef.current;
    const el = containerRef.current;
    if (!chart || !series || !el) return;
    const c = readChartColors();
    chart.applyOptions(chartThemeOptions(c));
    series.applyOptions(candleThemeOptions(c));
    publishChartColors(el, c);
  }, [theme]);

  // Price precision and locale/timezone-aware labels.
  useEffect(() => {
    if (containerRef.current) containerRef.current.dataset.timezone = fmt.timeZone;
    seriesRef.current?.applyOptions({ priceFormat: { type: 'price', precision, minMove: tickSize } });
    chartRef.current?.applyOptions({
      localization: {
        priceFormatter: (p: number) => fmt.price(p, precision),
        timeFormatter: (t: number) => fmt.dateTime(t * 1000),
      },
      timeScale: {
        tickMarkFormatter: (time: Time, tickType: TickMarkType) => fmt.tickMark((time as number) * 1000, tickType),
      },
    });
  }, [precision, tickSize, fmt]);

  // Data: setData on load / reload; series.update() for live steps (open candle moved or a new candle opened).
  useEffect(() => {
    const chart = chartRef.current;
    const series = seriesRef.current;
    const el = containerRef.current;
    if (!chart || !series || !el) return;
    const changed = liveChangedIndices(shownRef.current, candles);
    if (changed) {
      const last = candles.length - 1;
      for (const i of changed) series.update(toBar(candles[i]), i < last);
    } else {
      series.setData(candles.map(toBar));
      if (candles.length > 0) chart.timeScale().setVisibleLogicalRange({ from: candles.length - VISIBLE_BARS, to: candles.length + 3 });
    }
    shownRef.current = candles;
    const lastCandle = candles[candles.length - 1];
    const prev = candles[candles.length - 2];
    el.dataset.candleCount = String(candles.length);
    el.dataset.lastOpenTime = String(lastCandle ? lastCandle.openTime : '');
    el.dataset.lastClose = String(lastCandle ? lastCandle.close : '');
    el.dataset.prevCandle = prev ? [prev.open, prev.high, prev.low, prev.close].join(',') : '';
  }, [candles]);

  return <div ref={containerRef} data-testid="chart-root" data-candle-count="0" data-live={liveKey} className="absolute inset-0" />;
}
