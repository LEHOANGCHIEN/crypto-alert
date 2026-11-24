import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { priceDirection } from '../../shared/format';
import { useFormat } from '../../shared/format/useFormat';
import { errorText } from '../../shared/i18n/errorText';
import { useKlines, useSymbols, useTickers } from '../../shared/market/queries';
import { CandleChart } from './CandleChart';
import { ChartLegend } from './ChartLegend';
import { parseInterval, TimeframeBar } from './TimeframeBar';

const DIRECTION_CLASS = { up: 'text-up', down: 'text-down', flat: 'text-text-muted' } as const;

/** Center panel: header (symbol, price, 24h change), timeframe bar, candlestick chart with legend. */
export function ChartPanel() {
  const { t } = useTranslation();
  const fmt = useFormat();
  const { symbol = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const interval = parseInterval(params.get('tf'));
  const [hoveredTime, setHoveredTime] = useState<number | null>(null);

  const symbols = useSymbols();
  const tickers = useTickers();
  const info = symbols.data?.find((s) => s.symbol === symbol);
  const unknown = symbols.isSuccess && !info;
  const klines = useKlines(symbol, interval, Boolean(info));
  const ticker = tickers.data?.find((x) => x.symbol === symbol);

  const candles = klines.data;
  const shown = useMemo(() => {
    if (!candles?.length) return undefined;
    return (hoveredTime !== null ? candles.find((c) => c.openTime === hoveredTime) : undefined) ?? candles[candles.length - 1];
  }, [candles, hoveredTime]);

  if (unknown || (klines.error as { code?: string } | null)?.code === 'SYMBOL_NOT_FOUND') {
    return (
      <div data-testid="chart-not-found" className="flex flex-1 flex-col items-center justify-center gap-3 p-4 text-center">
        <h2 className="text-section font-semibold">{t('chart.notFound.title')}</h2>
        <p className="text-text-muted">{t('chart.notFound.description')}</p>
        <Link to="/trade/BTCUSDT" data-testid="chart-not-found-link" className="h-10 rounded-button bg-accent px-4 text-body font-medium leading-10 text-bg">
          {t('chart.notFound.link')}
        </Link>
      </div>
    );
  }

  const dir = ticker ? priceDirection(ticker.priceChangePercent) : 'flat';
  const fail = symbols.error ?? klines.error;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b border-border px-4 py-2">
        <h1 data-testid="chart-symbol" className="text-section font-semibold">
          {info ? `${info.baseAsset}/${info.quoteAsset}` : symbol}
        </h1>
        <span data-testid="chart-price" className={`text-price font-semibold ${DIRECTION_CLASS[dir]}`}>
          {ticker && info ? fmt.price(ticker.lastPrice, info.pricePrecision) : '—'}
        </span>
        <span data-testid="chart-change" className={`text-body ${DIRECTION_CLASS[dir]}`}>
          {ticker ? fmt.percent(ticker.priceChangePercent) : '—'}
        </span>
        <div className="ml-auto">
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
        </div>
      </div>
      <div className="relative min-h-0 flex-1">
        {info && candles && (
          <CandleChart candles={candles} precision={info.pricePrecision} tickSize={info.tickSize} onHover={setHoveredTime} />
        )}
        {info && candles && <ChartLegend candle={shown} hovered={hoveredTime !== null} precision={info.pricePrecision} />}
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
