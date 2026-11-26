import { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { errorText } from '../../shared/i18n/errorText';
import { useKlines, useSymbols, useTickers } from '../../shared/market/queries';
import { useLiveKlines } from '../../shared/market/useLiveMarket';
import { useConnection } from '../../shared/socket/connection.store';
import { IndicatorMenu, useIndicatorData, useIndicatorSettings } from '../indicators';
import { CandleChart } from './CandleChart';
import { useMaximized } from '../../shared/layout/maximize.store';
import { ChartActions } from './ChartActions';
import { ChartHeaderStats } from './ChartHeaderStats';
import { useChartType } from './chart-type.store';
import { ChartTypeMenu } from './ChartTypeMenu';
import { ChartLegend } from './ChartLegend';
import { parseInterval, TimeframeBar } from './TimeframeBar';

/** Center panel: header (symbol, price, 24h change), timeframe bar, candlestick chart with legend. */
export function ChartPanel() {
  const { t } = useTranslation();
  const { symbol = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const interval = parseInterval(params.get('tf'));
  const [hoveredTime, setHoveredTime] = useState<number | null>(null);
  const chartType = useChartType((s) => s.type);
  const maximized = useMaximized((s) => s.maximized);
  const shotRef = useRef<(() => HTMLCanvasElement) | null>(null);
  const onReady = useCallback((fn: (() => HTMLCanvasElement) | null) => {
    shotRef.current = fn;
  }, []);

  const symbols = useSymbols();
  const tickers = useTickers();
  const info = symbols.data?.find((s) => s.symbol === symbol);
  const unknown = symbols.isSuccess && !info;
  const klines = useKlines(symbol, interval, Boolean(info));
  useLiveKlines(symbol, interval, Boolean(info));
  const live = useConnection((st) => st.klineLive === `${symbol}:${interval}`);
  const ticker = tickers.data?.find((x) => x.symbol === symbol);

  const candles = klines.data;
  const indicatorSettings = useIndicatorSettings((s) => s.settings);
  const maPeriods = useMemo(() => indicatorSettings.ma.map((m) => m.period), [indicatorSettings]);
  const indicators = useIndicatorData(candles, maPeriods);
  const shownIndex = useMemo(() => {
    if (!candles?.length) return -1;
    const i = hoveredTime !== null ? candles.findIndex((c) => c.openTime === hoveredTime) : -1;
    return i >= 0 ? i : candles.length - 1;
  }, [candles, hoveredTime]);
  const shown = candles?.[shownIndex];

  if (unknown || (klines.error as { code?: string } | null)?.code === 'SYMBOL_NOT_FOUND') {
    return (
      <div data-testid="chart-not-found" className="flex flex-1 flex-col items-center justify-center gap-3 p-4 text-center">
        <h2 className="text-section font-semibold">{t('chart.notFound.title')}</h2>
        <p className="text-text-muted">{t('chart.notFound.description')}</p>
        <Link to="/trade/BTCUSDT" data-testid="chart-not-found-link" className="h-8 rounded-button bg-accent px-4 text-body font-medium leading-8 text-bg">
          {t('chart.notFound.link')}
        </Link>
      </div>
    );
  }

  const fail = symbols.error ?? klines.error;

  return (
    <div
      data-testid="chart-panel"
      data-maximized={maximized}
      className={`flex min-h-0 flex-1 flex-col ${maximized ? 'fixed inset-0 z-50 bg-bg' : ''}`}
    >
      <ChartHeaderStats symbol={symbol} info={info} ticker={ticker} />
      <div className="flex h-toolbar shrink-0 items-center gap-2 border-b border-border px-3">
        <TimeframeBar
          active={interval}
          onChange={(i) =>
            setParams((p) => {
              const next = new URLSearchParams(p);
              next.set('tf', i);
              return next;
            })
          }
        />
        <ChartTypeMenu />
        <IndicatorMenu />
        <ChartActions symbol={symbol} interval={interval} screenshot={() => shotRef.current?.() ?? null} />
      </div>
      <div className="relative min-h-0 flex-1">
        {info && candles && (
          <CandleChart
            candles={candles}
            precision={info.pricePrecision}
            tickSize={info.tickSize}
            onHover={setHoveredTime}
            liveKey={live ? `${symbol}:${interval}` : ''}
            indicators={indicators}
            settings={indicatorSettings}
            chartType={chartType}
            onReady={onReady}
          />
        )}
        {info && candles && (
          <ChartLegend
            candle={shown}
            index={shownIndex}
            hovered={hoveredTime !== null}
            precision={info.pricePrecision}
            indicators={indicators}
            settings={indicatorSettings}
          />
        )}
        {fail ? (
          <div data-testid="chart-error" className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-text-muted">
            <p>{errorText(t, fail)}</p>
            <button type="button" onClick={() => void klines.refetch()} className="h-8 rounded-button bg-surface-2 px-3 text-body text-text">
              {t('market.retry')}
            </button>
          </div>
        ) : (
          (symbols.isPending || klines.isPending || klines.isFetching) &&
          !candles && (
            <div data-testid="chart-loading" role="status" className="absolute inset-0 flex items-center justify-center text-text-muted">
              {t('common.loading')}
            </div>
          )
        )}
      </div>
    </div>
  );
}
