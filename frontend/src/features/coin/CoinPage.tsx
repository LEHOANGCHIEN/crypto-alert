import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { useFormat } from '../../shared/format/useFormat';
import { useSymbols, useTickers } from '../../shared/market/queries';
import { useLiveTickers } from '../../shared/market/useLiveMarket';
import { useConnection } from '../../shared/socket/connection.store';
import { CoinHeader } from './CoinHeader';
import { KeyStats } from './KeyStats';
import { chartQuery, DAILY_BASE, DEFAULT_RANGE, queryId, RANGES, TILE_BASES, type Range } from './lib/ranges';
import { highLow, rangeChange, tileChange } from './lib/performance';
import { PerformanceTiles } from './PerformanceTiles';
import { RangeChart } from './RangeChart';
import { useRangeKlines } from './useCoinData';

/** `/coin/:symbol` — coin overview (AC-COIN-01…04). Public. */
export function CoinPage() {
  const { t } = useTranslation();
  const fmt = useFormat();
  const { symbol = '' } = useParams();
  const symbols = useSymbols();
  const tickers = useTickers();
  const live = useConnection((s) => s.tickersLive);
  useLiveTickers();
  const [range, setRange] = useState<Range>(DEFAULT_RANGE);

  const info = symbols.data?.find((s) => s.symbol === symbol);
  const known = info !== undefined;
  const ticker = tickers.data?.find((x) => x.symbol === symbol);
  const [openedAt] = useState(() => Date.now()); // fixed for the visit, so the YTD limit does not change under the chart
  const ytdDays = fmt.daysSinceYearStart(openedAt);

  // The chart asks for exactly the interval × limit of the range; tiles and 52-week stats share the base queries.
  const chart = useRangeKlines(symbol, chartQuery(range, ytdDays), { enabled: known, fresh: true });
  const bases = [
    useRangeKlines(symbol, TILE_BASES[0], { enabled: known }),
    useRangeKlines(symbol, TILE_BASES[1], { enabled: known }),
    useRangeKlines(symbol, TILE_BASES[2], { enabled: known }),
    useRangeKlines(symbol, TILE_BASES[3], { enabled: known }),
  ];
  const byId = Object.fromEntries(TILE_BASES.map((q, i) => [queryId(q), bases[i].data]));
  const changes = Object.fromEntries(RANGES.map((r) => [r, tileChange(r, ytdDays, byId)])) as Record<Range, number | null | undefined>;
  const week52 = useMemo(() => {
    const daily = byId[queryId(DAILY_BASE)];
    return daily ? highLow(daily) : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bases[3].data]);

  if (symbols.isPending) {
    return (
      <p data-testid="coin-page" data-live={String(live)} className="text-body text-text-muted">
        {t('common.loading')}
      </p>
    );
  }
  if (!info) {
    return (
      <div data-testid="coin-page" data-live={String(live)} className="mx-auto flex max-w-md flex-col items-center gap-3 p-8 text-center">
        <div data-testid="coin-not-found" className="flex flex-col items-center gap-3">
          <h1 className="text-page font-semibold">{t('coin.notFound.title')}</h1>
          <p className="text-body text-text-muted">{t('coin.notFound.description')}</p>
          <Link to="/coin/BTCUSDT" data-testid="coin-not-found-link" className="h-8 rounded-button bg-accent px-4 text-body font-medium leading-8 text-bg">
            {t('coin.notFound.link')}
          </Link>
        </div>
      </div>
    );
  }

  const candles = chart.data ?? [];
  const change = rangeChange(candles);
  const direction = change === null ? 'flat' : change > 0 ? 'up' : change < 0 ? 'down' : 'flat';

  return (
    <div data-testid="coin-page" data-live={String(live)} className="mx-auto flex w-full max-w-screen-2xl flex-col gap-6">
      <CoinHeader symbol={symbol} info={info} ticker={ticker} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <div className="flex min-w-0 flex-col gap-4 lg:col-span-3">
          <section aria-label={t('coin.chart', { pair: `${info.baseAsset}/${info.quoteAsset}` })} className="rounded-card border border-border bg-surface p-4">
            <div role="group" aria-label={t('coin.ranges.label')} className="mb-3 flex flex-wrap gap-1">
              {RANGES.map((r) => (
                <button
                  key={r}
                  type="button"
                  data-testid={`coin-range-${r}`}
                  aria-pressed={range === r}
                  onClick={() => setRange(r)}
                  className={`h-8 rounded-input px-3 text-section ${range === r ? 'bg-surface-3 font-medium text-text' : 'text-text-muted hover:text-text'}`}
                >
                  {t(`coin.ranges.${r}`)}
                </button>
              ))}
            </div>
            <div className="relative h-80 sm:h-96">
              <RangeChart candles={candles} range={range} direction={direction} precision={info.pricePrecision} />
              {chart.isPending && <p className="absolute inset-0 flex items-center justify-center text-body text-text-muted">{t('common.loading')}</p>}
            </div>
          </section>
          <PerformanceTiles changes={changes} selected={range} onSelect={setRange} />
        </div>
        <div className="min-w-0 lg:col-span-1">
          <KeyStats info={info} ticker={ticker} week52={week52} />
        </div>
      </div>
    </div>
  );
}
