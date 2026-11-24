import {
  HistogramSeries,
  LineSeries,
  LineStyle,
  type HistogramData,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
  type LineData,
  type UTCTimestamp,
  type WhitespaceData,
} from 'lightweight-charts';
import type { IndicatorData, IndicatorSettings, Series } from '../indicators';
import type { ChartColors } from './chart-theme';

type Line = ISeriesApi<'Line'>;
type Hist = ISeriesApi<'Histogram'>;
type Point = LineData<UTCTimestamp> | WhitespaceData<UTCTimestamp>;

const RSI_GUIDES = [70, 30];
const OSC_STRETCH = 0.35; // oscillator pane height relative to the price pane (1)

const lineOptions = (color: string) => ({ color, lineWidth: 1 as const, lastValueVisible: false, priceLineVisible: false, crosshairMarkerVisible: false });
const point = (time: UTCTimestamp, v: number | null): Point => (v === null ? { time } : { time, value: v });

/**
 * MA lines on the price pane, RSI and MACD in their own panes (Lightweight Charts v5 panes).
 * Owns the series; the chart component decides when to set all data or update the last candles.
 */
export class IndicatorLayers {
  private ma: (Line | null)[] = [null, null, null];
  private rsi: { line: Line; guides: IPriceLine[] } | null = null;
  private macd: { line: Line; signal: Line; hist: Hist } | null = null;
  private times: UTCTimestamp[] = [];
  private data: IndicatorData | null = null;

  constructor(
    private readonly chart: IChartApi,
    private colors: ChartColors,
  ) {}

  /** Adds/removes series for the settings. Returns true when the set of series changed (data must be set again). */
  sync(settings: IndicatorSettings): boolean {
    let changed = false;
    settings.ma.forEach((m, i) => {
      const s = this.ma[i];
      if (m.enabled && !s) {
        this.ma[i] = this.chart.addSeries(LineSeries, lineOptions(this.colors.ma[i]), 0);
        changed = true;
      } else if (!m.enabled && s) {
        this.chart.removeSeries(s);
        this.ma[i] = null;
        changed = true;
      }
    });
    // Oscillator panes keep the order RSI, MACD: rebuild both whenever one is toggled.
    if (Boolean(this.rsi) !== settings.rsi || Boolean(this.macd) !== settings.macd) {
      this.removeOscillators();
      let pane = 1;
      if (settings.rsi) this.addRsi(pane++);
      if (settings.macd) this.addMacd(pane);
      for (const p of this.chart.panes().slice(1)) p.setStretchFactor(OSC_STRETCH);
      changed = true;
    }
    return changed;
  }

  private addRsi(pane: number) {
    const line = this.chart.addSeries(LineSeries, { ...lineOptions(this.colors.rsi), priceFormat: { type: 'price', precision: 2, minMove: 0.01 } }, pane);
    const guides = RSI_GUIDES.map((price) =>
      line.createPriceLine({ price, color: this.colors.text, lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true }),
    );
    this.rsi = { line, guides };
  }

  private addMacd(pane: number) {
    const hist = this.chart.addSeries(HistogramSeries, { lastValueVisible: false, priceLineVisible: false }, pane);
    const line = this.chart.addSeries(LineSeries, lineOptions(this.colors.macd), pane);
    const signal = this.chart.addSeries(LineSeries, lineOptions(this.colors.signal), pane);
    this.macd = { line, signal, hist };
  }

  private removeOscillators() {
    if (this.rsi) this.chart.removeSeries(this.rsi.line);
    if (this.macd) for (const s of [this.macd.hist, this.macd.line, this.macd.signal]) this.chart.removeSeries(s);
    this.rsi = null;
    this.macd = null;
  }

  private histPoint(i: number): HistogramData<UTCTimestamp> | WhitespaceData<UTCTimestamp> {
    const v = (this.data as IndicatorData).hist[i];
    const time = this.times[i];
    return v === null ? { time } : { time, value: v, color: v >= 0 ? this.colors.up : this.colors.down };
  }

  private each(fn: (s: Line, values: Series) => void) {
    const d = this.data as IndicatorData;
    this.ma.forEach((s, i) => s && fn(s, d.ma[i]));
    if (this.rsi) fn(this.rsi.line, d.rsi);
    if (this.macd) {
      fn(this.macd.line, d.macd);
      fn(this.macd.signal, d.signal);
    }
  }

  /** Full data for every shown series. */
  setData(times: UTCTimestamp[], data: IndicatorData) {
    this.times = times;
    this.data = data;
    this.each((s, values) => s.setData(values.map((v, i) => point(times[i], v))));
    this.macd?.hist.setData(times.map((_, i) => this.histPoint(i)));
  }

  /** Live step: only these (ascending, last-ish) indices changed. */
  update(times: UTCTimestamp[], data: IndicatorData, indices: number[]) {
    this.times = times;
    this.data = data;
    const last = times.length - 1;
    for (const i of indices) {
      this.each((s, values) => s.update(point(times[i], values[i]), i < last));
      this.macd?.hist.update(this.histPoint(i), i < last);
    }
  }

  /** Theme toggle: re-color lines and guides, and re-color the histogram bars. */
  applyColors(colors: ChartColors) {
    this.colors = colors;
    this.ma.forEach((s, i) => s?.applyOptions({ color: colors.ma[i] }));
    if (this.rsi) {
      this.rsi.line.applyOptions({ color: colors.rsi });
      for (const g of this.rsi.guides) g.applyOptions({ color: colors.text });
    }
    if (this.macd) {
      this.macd.line.applyOptions({ color: colors.macd });
      this.macd.signal.applyOptions({ color: colors.signal });
      if (this.data) this.macd.hist.setData(this.times.map((_, i) => this.histPoint(i)));
    }
  }

  /** Exposes what is drawn for end-to-end tests (the chart itself is a canvas). */
  publish(el: HTMLElement, settings: IndicatorSettings) {
    const shown = settings.ma.map((m, i) => ({ m, s: this.ma[i] })).filter((x) => x.s);
    el.dataset.panes = String(this.chart.panes().length);
    el.dataset.maSeries = shown.map((x) => x.m.period).join(',');
    el.dataset.maColors = shown.map((x) => x.s?.options().color).join(',');
    el.dataset.rsiGuides = this.rsi ? this.rsi.guides.map((g) => g.options().price).join(',') : '';
    el.dataset.rsiGuideStyle = this.rsi ? (this.rsi.guides.every((g) => g.options().lineStyle === LineStyle.Dashed) ? 'dashed' : 'solid') : '';
    el.dataset.macdSeries = this.macd ? 'macd,signal,hist' : '';
    const lastHist = this.macd?.hist.data().at(-1) as HistogramData<UTCTimestamp> | undefined;
    el.dataset.histLastColor = lastHist?.color ?? '';
  }
}
