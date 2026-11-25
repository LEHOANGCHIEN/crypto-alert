import {
  AreaSeries,
  BarSeries,
  CandlestickSeries,
  LineSeries,
  type CandlestickData,
  type IChartApi,
  type ISeriesApi,
  type LineData,
  type OhlcData,
  type UTCTimestamp,
} from 'lightweight-charts';
import type { Candle } from '../../shared/api/types';
import { candleThemeOptions, type ChartColors } from './chart-theme';

export type ChartType = 'candles' | 'bars' | 'line' | 'area';
export const CHART_TYPES: ChartType[] = ['candles', 'bars', 'line', 'area'];
export const DEFAULT_CHART_TYPE: ChartType = 'candles';
export const CHART_TYPE_STORAGE_KEY = 'crypto-alert.chart-type';

export type MainSeries = ISeriesApi<'Candlestick'> | ISeriesApi<'Bar'> | ISeriesApi<'Line'> | ISeriesApi<'Area'>;
export type MainPoint = CandlestickData<UTCTimestamp> | OhlcData<UTCTimestamp> | LineData<UTCTimestamp>;

export const parseChartType = (raw: string | null): ChartType => (CHART_TYPES.includes(raw as ChartType) ? (raw as ChartType) : DEFAULT_CHART_TYPE);

const seconds = (k: Candle) => Math.floor(k.openTime / 1000) as UTCTimestamp;

/** Candles and bars carry OHLC, line and area carry the close price. */
export function toPoint(type: ChartType, k: Candle): MainPoint {
  if (type === 'line' || type === 'area') return { time: seconds(k), value: k.close };
  return { time: seconds(k), open: k.open, high: k.high, low: k.low, close: k.close };
}

/** Theme-dependent options per type: candles/bars use the up/down tokens, line/area the accent token. */
export function mainSeriesOptions(type: ChartType, c: ChartColors) {
  switch (type) {
    case 'candles':
      return { ...candleThemeOptions(c), borderVisible: false };
    case 'bars':
      return { upColor: c.up, downColor: c.down };
    case 'line':
      return { color: c.accent, lineWidth: 2 as const };
    case 'area':
      return { lineColor: c.accent, topColor: c.accentSoft, bottomColor: c.accentClear, lineWidth: 2 as const };
  }
}

/** Adds the price series of the given type to pane 0 and puts it below the indicator lines. */
export function addMainSeries(chart: IChartApi, type: ChartType, c: ChartColors): MainSeries {
  const def = { candles: CandlestickSeries, bars: BarSeries, line: LineSeries, area: AreaSeries }[type];
  const series = chart.addSeries(def as typeof CandlestickSeries, mainSeriesOptions(type, c) as never, 0) as MainSeries;
  series.setSeriesOrder(0);
  return series;
}
