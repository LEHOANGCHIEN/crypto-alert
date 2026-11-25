import { HistogramSeries, type HistogramData, type IChartApi, type ISeriesApi, type UTCTimestamp } from 'lightweight-charts';
import type { Candle } from '../../shared/api/types';
import type { ChartColors } from './chart-theme';

const SCALE_ID = 'volume';
const SCALE_TOP = 0.8; // bars use about the lowest 20 % of the price pane

const seconds = (k: Candle) => Math.floor(k.openTime / 1000) as UTCTimestamp;

/** Volume bars overlaid on the price pane (own price scale), one bar per candle colored by its direction. */
export class VolumeLayer {
  private series: ISeriesApi<'Histogram'> | null = null;
  private candles: Candle[] = [];

  constructor(
    private readonly chart: IChartApi,
    private colors: ChartColors,
  ) {}

  /** Adds/removes the series. Returns true when it changed (data must be set again). */
  sync(enabled: boolean): boolean {
    if (enabled && !this.series) {
      this.series = this.chart.addSeries(
        HistogramSeries,
        { priceScaleId: SCALE_ID, priceFormat: { type: 'volume' }, lastValueVisible: false, priceLineVisible: false },
        0,
      );
      this.chart.priceScale(SCALE_ID, 0).applyOptions({ scaleMargins: { top: SCALE_TOP, bottom: 0 } });
      this.series.setSeriesOrder(0);
      return true;
    }
    if (!enabled && this.series) {
      this.chart.removeSeries(this.series);
      this.series = null;
      return true;
    }
    return false;
  }

  private bar(k: Candle): HistogramData<UTCTimestamp> {
    return { time: seconds(k), value: k.volume, color: k.close >= k.open ? this.colors.upVolume : this.colors.downVolume };
  }

  setData(candles: Candle[]) {
    this.candles = candles;
    this.series?.setData(candles.map((k) => this.bar(k)));
  }

  update(candles: Candle[], indices: number[]) {
    this.candles = candles;
    const last = candles.length - 1;
    for (const i of indices) this.series?.update(this.bar(candles[i]), i < last);
  }

  applyColors(colors: ChartColors) {
    this.colors = colors;
    if (this.series) this.series.setData(this.candles.map((k) => this.bar(k)));
  }

  /** Test hooks: what is drawn (the chart itself is a canvas). */
  publish(el: HTMLElement) {
    const data = (this.series?.data() ?? []) as HistogramData<UTCTimestamp>[];
    const last = data.at(-1);
    el.dataset.volumeCount = String(data.length);
    el.dataset.volumeScaleTop = this.series ? String(this.chart.priceScale(SCALE_ID, 0).options().scaleMargins.top) : '';
    el.dataset.volumeLastValue = last ? String(last.value) : '';
    el.dataset.volumeLastTime = last ? String(last.time) : '';
    el.dataset.volumeLastColor = last?.color ?? '';
    el.dataset.volumeUpColor = data.filter((_, i) => this.candles[i] && this.candles[i].close >= this.candles[i].open).at(-1)?.color ?? '';
    el.dataset.volumeDownColor = data.filter((_, i) => this.candles[i] && this.candles[i].close < this.candles[i].open).at(-1)?.color ?? '';
  }
}
