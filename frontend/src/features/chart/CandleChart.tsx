import { useEffect, useRef } from 'react';
import { createChart, type IChartApi, type LineData, type OhlcData, type TickMarkType, type Time } from 'lightweight-charts';
import type { Candle } from '../../shared/api/types';
import type { IndicatorData, IndicatorSettings } from '../indicators';
import { liveChangedIndices } from '../../shared/market/live';
import { useFormat } from '../../shared/format/useFormat';
import { useTheme } from '../../shared/theme/ThemeProvider';
import { chartThemeOptions, publishChartColors, readChartColors } from './chart-theme';
import { addMainSeries, mainSeriesOptions, toPoint, type ChartType, type MainSeries } from './chart-series';
import { VolumeLayer } from './volume-layer';
import { IndicatorLayers } from './indicator-layers';

type Props = {
  candles: Candle[];
  precision: number;
  tickSize: number;
  /** open time (epoch ms) of the candle under the crosshair, null when the pointer leaves the chart */
  onHover: (openTime: number | null) => void;
  /** `SYMBOL:interval` while live updates are subscribed (test hook `data-live`), '' otherwise */
  liveKey: string;
  /** Indicator series computed for `candles` (same indices) and which of them are shown. */
  indicators: IndicatorData | null;
  settings: IndicatorSettings;
  /** how the price series is drawn (AC-CHART-07) */
  chartType: ChartType;
};

const timeOf = (k: Candle) => Math.floor(k.openTime / 1000);

const VISIBLE_BARS = 120;

/** Lightweight Charts v5 candlestick chart. Times are UTC seconds; display timezone is applied by the formatters. */
export function CandleChart({ candles, precision, tickSize, onHover, liveKey, indicators, settings, chartType }: Props) {
  const fmt = useFormat();
  const { theme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<MainSeries | null>(null);
  const volumeRef = useRef<VolumeLayer | null>(null);
  const typeSwapRef = useRef(false);
  const shownRef = useRef<Candle[]>([]);
  const layersRef = useRef<IndicatorLayers | null>(null);
  const shownIndRef = useRef<IndicatorData | null>(null);
  const settingsRef = useRef(settings);
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
      layout: { ...chartThemeOptions(c).layout, attributionLogo: true, fontFamily: "'Roboto Mono', ui-monospace, monospace" },
      timeScale: { ...chartThemeOptions(c).timeScale, timeVisible: true, secondsVisible: false },
    });
    publishChartColors(el, c);
    chart.subscribeCrosshairMove((param) => {
      hoverRef.current(param.time === undefined ? null : (param.time as number) * 1000);
    });
    // Test hook: the chart follows its container (autoSize) when a column is dragged; no data is refetched.
    const ro = new ResizeObserver(() => {
      el.dataset.canvasWidth = String(Math.round(el.clientWidth));
    });
    ro.observe(el);
    chartRef.current = chart;
    layersRef.current = new IndicatorLayers(chart, c);
    volumeRef.current = new VolumeLayer(chart, c);
    shownRef.current = []; // a new chart has no data yet: the data effect must call setData
    shownIndRef.current = null;
    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      layersRef.current = null;
      volumeRef.current = null;
      shownRef.current = [];
      shownIndRef.current = null;
    };
  }, []);

  // Price series of the chosen type (candles / bars / line / area); swapping keeps the view and re-sets the data.
  useEffect(() => {
    const chart = chartRef.current;
    const el = containerRef.current;
    if (!chart || !el) return;
    const series = addMainSeries(chart, chartType, readChartColors());
    seriesRef.current = series;
    typeSwapRef.current = shownRef.current.length > 0;
    shownRef.current = []; // the new series has no data yet: the data effect must call setData
    el.dataset.chartType = chartType;
    return () => {
      if (chartRef.current === chart) chart.removeSeries(series); // not when the chart itself is being disposed
      if (seriesRef.current === series) seriesRef.current = null;
    };
  }, [chartType]);

  // Re-apply token colors when the theme is toggled (no reload; candle colors stay the up/down tokens).
  useEffect(() => {
    const chart = chartRef.current;
    const series = seriesRef.current;
    const el = containerRef.current;
    if (!chart || !series || !el) return;
    const c = readChartColors();
    chart.applyOptions(chartThemeOptions(c));
    series.applyOptions(mainSeriesOptions(chartType, c) as never);
    layersRef.current?.applyColors(c);
    volumeRef.current?.applyColors(c);
    publishChartColors(el, c);
    publishSeries(el, series);
    if (layersRef.current) layersRef.current.publish(el, settingsRef.current);
  }, [theme, chartType]);

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
  }, [precision, tickSize, fmt, chartType]);

  // Data: setData on load / reload; series.update() for live steps (open candle moved or a new candle opened).
  // Indicators follow the same rule; a change of shown indicators or MA periods re-sets only the indicator data.
  useEffect(() => {
    const chart = chartRef.current;
    const series = seriesRef.current;
    const layers = layersRef.current;
    const el = containerRef.current;
    if (!chart || !series || !layers || !el) return;
    settingsRef.current = settings;
    const volume = volumeRef.current;
    const candlesChanged = shownRef.current !== candles;
    const changed = liveChangedIndices(shownRef.current, candles);
    const volumeStructural = volume ? volume.sync(settings.volume) : false;
    if (candlesChanged) {
      if (changed) {
        const last = candles.length - 1;
        for (const i of changed) series.update(toPoint(chartType, candles[i]) as OhlcData<Time> | LineData<Time> as never, i < last);
        if (!volumeStructural) volume?.update(candles, changed);
      } else {
        series.setData(candles.map((k) => toPoint(chartType, k)) as never);
        // A type swap keeps the user's scroll/zoom; a fresh load shows the latest bars.
        if (candles.length > 0 && !typeSwapRef.current) chart.timeScale().setVisibleLogicalRange({ from: candles.length - VISIBLE_BARS, to: candles.length + 3 });
      }
      typeSwapRef.current = false;
      shownRef.current = candles;
    }
    if (volume && (volumeStructural || (candlesChanged && !changed))) volume.setData(candles);

    const structural = layers.sync(settings);
    const prevInd = shownIndRef.current;
    if (indicators && (structural || prevInd !== indicators)) {
      const times = candles.map((k) => timeOf(k) as never);
      const samePeriods = prevInd !== null && prevInd.maPeriods.join(',') === indicators.maPeriods.join(',');
      if (!structural && candlesChanged && changed && samePeriods) layers.update(times, indicators, changed);
      else layers.setData(times, indicators);
      shownIndRef.current = indicators;
    }
    layers.publish(el, settings);
    volume?.publish(el);
    publishSeries(el, series);

    const lastCandle = candles[candles.length - 1];
    const prev = candles[candles.length - 2];
    el.dataset.candleCount = String(candles.length);
    el.dataset.lastOpenTime = String(lastCandle ? lastCandle.openTime : '');
    el.dataset.lastClose = String(lastCandle ? lastCandle.close : '');
    el.dataset.prevCandle = prev ? [prev.open, prev.high, prev.low, prev.close].join(',') : '';
  }, [candles, indicators, settings, chartType]);

  return <div ref={containerRef} data-testid="chart-root" data-candle-count="0" data-live={liveKey} className="absolute inset-0" />;
}

/** Test hooks for the price series: its last drawn value and color (the chart itself is a canvas). */
function publishSeries(el: HTMLElement, series: MainSeries) {
  const last = series.data().at(-1) as (OhlcData<Time> & LineData<Time>) | undefined;
  el.dataset.seriesLastValue = last ? String(last.value ?? last.close) : '';
  const o = series.options() as { color?: string; lineColor?: string; upColor?: string; downColor?: string };
  el.dataset.seriesColor = o.color ?? o.lineColor ?? o.upColor ?? '';
  el.dataset.seriesDownColor = o.downColor ?? '';
}
