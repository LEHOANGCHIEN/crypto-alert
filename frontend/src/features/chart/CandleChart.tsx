import { useEffect, useRef } from 'react';
import {
  CandlestickSeries,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type UTCTimestamp,
} from 'lightweight-charts';
import type { Candle } from '../../shared/api/types';
import { useFormat } from '../../shared/format/useFormat';
import { readChartColors } from './chart-theme';

type Props = {
  candles: Candle[];
  precision: number;
  tickSize: number;
  /** open time (epoch ms) of the candle under the crosshair, null when the pointer leaves the chart */
  onHover: (openTime: number | null) => void;
};

const VISIBLE_BARS = 120;

/** Lightweight Charts v5 candlestick chart. Times are UTC seconds; display timezone is applied by the formatters. */
export function CandleChart({ candles, precision, tickSize, onHover }: Props) {
  const fmt = useFormat();
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
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
      layout: { attributionLogo: true, background: { color: c.background }, textColor: c.text, fontFamily: 'Inter, system-ui, sans-serif' },
      grid: { vertLines: { color: c.grid }, horzLines: { color: c.grid } },
      crosshair: { vertLine: { color: c.crosshair }, horzLine: { color: c.crosshair } },
      rightPriceScale: { borderColor: c.border },
      timeScale: { borderColor: c.border, timeVisible: true, secondsVisible: false },
    });
    const series = chart.addSeries(CandlestickSeries, {
      upColor: c.up,
      downColor: c.down,
      wickUpColor: c.up,
      wickDownColor: c.down,
      borderVisible: false,
    });
    chart.subscribeCrosshairMove((param) => {
      hoverRef.current(param.time === undefined ? null : (param.time as number) * 1000);
    });
    chartRef.current = chart;
    seriesRef.current = series;
    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  // Price precision and locale/timezone-aware labels.
  useEffect(() => {
    seriesRef.current?.applyOptions({ priceFormat: { type: 'price', precision, minMove: tickSize } });
    chartRef.current?.applyOptions({
      localization: {
        priceFormatter: (p: number) => fmt.price(p, precision),
        timeFormatter: (t: number) => fmt.dateTime(t * 1000),
      },
    });
  }, [precision, tickSize, fmt]);

  // Data: setData on load (live updates arrive in Phase 3).
  useEffect(() => {
    const chart = chartRef.current;
    const series = seriesRef.current;
    const el = containerRef.current;
    if (!chart || !series || !el) return;
    const data: CandlestickData<UTCTimestamp>[] = candles.map((k) => ({
      time: Math.floor(k.openTime / 1000) as UTCTimestamp,
      open: k.open,
      high: k.high,
      low: k.low,
      close: k.close,
    }));
    series.setData(data);
    if (data.length > 0) chart.timeScale().setVisibleLogicalRange({ from: data.length - VISIBLE_BARS, to: data.length + 3 });
    el.dataset.candleCount = String(candles.length);
    el.dataset.lastOpenTime = String(candles.length ? candles[candles.length - 1].openTime : '');
  }, [candles]);

  return <div ref={containerRef} data-testid="chart-root" data-candle-count="0" className="absolute inset-0" />;
}
