import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useVirtualizer } from '@tanstack/react-virtual';
import { priceDirection } from '../../shared/format';
import { useFormat } from '../../shared/format/useFormat';
import { errorText } from '../../shared/i18n/errorText';
import { parseInterval } from '../chart/TimeframeBar';
import { useSymbols, useTickers } from '../../shared/market/queries';
import { useConnection } from '../../shared/socket/connection.store';
import { useAuth } from '../../shared/auth/auth.store';
import { StarButton, useWatchlist } from '../watchlist';
import { PriceCell } from '../../shared/ui/PriceCell';

const ROW_HEIGHT = 48; // two-line rows (--spacing-row)
const ROW_GRID = 'grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-2';
const DIRECTION_CLASS = { up: 'text-up', down: 'text-down', flat: 'text-text-muted' } as const;

/** Left panel: All/Watchlist tabs, search + virtualised two-line list of USDT pairs, default order = 24h quote volume desc. */
export function MarketList({ onSelect }: { onSelect?: () => void }) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const navigate = useNavigate();
  const { symbol: current = '' } = useParams();
  const [params] = useSearchParams();
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<'all' | 'watchlist'>('all');
  const authed = useAuth((st) => st.status === 'authenticated');
  const guest = useAuth((st) => st.status === 'guest');
  const watchlist = useWatchlist();
  const symbols = useSymbols();
  const tickers = useTickers();
  const scrollRef = useRef<HTMLDivElement>(null);
  const live = useConnection((st) => st.tickersLive);

  const precision = useMemo(() => new Map((symbols.data ?? []).map((s) => [s.symbol, s])), [symbols.data]);
  const rows = useMemo(() => {
    const q = query.trim().toUpperCase();
    const watched = tab === 'watchlist' ? new Set((watchlist.data ?? []).map((w) => w.symbol)) : null;
    return (tickers.data ?? []).filter((x) => precision.has(x.symbol) && (!watched || watched.has(x.symbol)) && (q === '' || x.symbol.includes(q)));
  }, [tickers.data, precision, query, tab, watchlist.data]);

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Virtual is not memoisation-safe; the list is not memoised
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
    // Fallback so the first rows render even before the scroll container has been measured.
    initialRect: { width: 320, height: 640 },
  });

  const error = symbols.error ?? tickers.error;
  const loading = symbols.isPending || tickers.isPending || (tab === 'watchlist' && authed && watchlist.isPending);
  const needLogin = tab === 'watchlist' && guest;

  const open = (symbol: string) => {
    navigate(`/trade/${symbol}?tf=${parseInterval(params.get('tf'))}`);
    onSelect?.();
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div role="tablist" aria-label={t('market.tabs.label')} className="flex h-8 shrink-0 gap-4 border-b border-border px-3">
        {(['all', 'watchlist'] as const).map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            data-testid={`market-tab-${id}`}
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`text-section font-medium ${tab === id ? 'border-b-2 border-accent text-text' : 'text-text-muted'}`}
          >
            {t(`market.tabs.${id}`)}
          </button>
        ))}
      </div>
      <div className="shrink-0 border-b border-border p-2">
        <input
          type="search"
          data-testid="market-search"
          aria-label={t('market.search.label')}
          placeholder={t('market.search.placeholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-8 w-full rounded-input border border-border bg-surface-2 px-3 text-body text-text placeholder:text-text-faint"
        />
      </div>
      <div data-testid="market-columns" className={`${ROW_GRID} shrink-0 border-b border-border px-3 py-1 text-meta text-text-faint`}>
        <div aria-hidden="true" />
        <div className="flex min-w-0 gap-1 truncate">
          <span>{t('market.columns.pair')}</span>
          <i aria-hidden="true">/</i>
          <span>{t('market.columns.volume')}</span>
        </div>
        <div className="flex justify-end gap-1 text-right">
          <span>{t('market.columns.price')}</span>
          <i aria-hidden="true">/</i>
          <span>{t('market.columns.change')}</span>
        </div>
      </div>

      {error ? (
        <div data-testid="market-error" className="flex flex-col items-center gap-3 p-4 text-center text-text-muted">
          <p>{errorText(t, error)}</p>
          <button
            type="button"
            onClick={() => {
              void symbols.refetch();
              void tickers.refetch();
            }}
            className="h-8 rounded-button bg-surface-2 px-3 text-body text-text"
          >
            {t('market.retry')}
          </button>
        </div>
      ) : loading ? (
        <div data-testid="market-loading" aria-busy="true" className="flex flex-col gap-1 p-2">
          {Array.from({ length: 10 }, (_, i) => (
            <div key={i} className="h-row animate-pulse rounded-input bg-surface-2" />
          ))}
        </div>
      ) : needLogin ? (
        <div data-testid="market-tab-login-prompt" className="flex flex-col items-center gap-3 p-4 text-center text-text-muted">
          <p>{t('market.watchlistLogin')}</p>
          <Link to="/login" className="h-8 rounded-button bg-accent px-4 text-body font-medium leading-8 text-white">
            {t('market.watchlistLoginLink')}
          </Link>
        </div>
      ) : rows.length === 0 ? (
        <p data-testid="market-empty" className="p-4 text-center text-text-muted">
          {tab === 'watchlist' && query.trim() === '' ? t('market.watchlistEmpty') : t('market.empty')}
        </p>
      ) : (
        <div ref={scrollRef} role="listbox" aria-label={t('market.list')} data-testid="market-list" data-live={live} className="min-h-0 flex-1 overflow-y-auto">
          <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
            {virtualizer.getVirtualItems().map((v) => {
              const tk = rows[v.index];
              const info = precision.get(tk.symbol)!;
              const dir = priceDirection(tk.priceChangePercent);
              const selected = tk.symbol === current;
              return (
                <div
                  key={tk.symbol}
                  role="option"
                  tabIndex={0}
                  aria-selected={selected}
                  data-testid={`market-row-${tk.symbol}`}
                  data-direction={dir}
                  onClick={() => open(tk.symbol)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      open(tk.symbol);
                    }
                  }}
                  className={`absolute left-0 top-0 w-full cursor-pointer px-3 hover:bg-surface-3 ${ROW_GRID} ${
                    selected ? 'bg-surface-2' : ''
                  }`}
                  style={{ height: v.size, transform: `translateY(${v.start}px)` }}
                >
                  <StarButton symbol={tk.symbol} />
                  <span className="flex min-w-0 flex-col">
                    <span data-testid={`market-pair-${tk.symbol}`} className="truncate text-body font-semibold">
                      {info.baseAsset}
                      <span className="font-normal text-text-faint">/{info.quoteAsset}</span>
                    </span>
                    <span data-testid={`market-volume-${tk.symbol}`} className="truncate font-mono text-meta text-text-faint">
                      {fmt.compact(tk.quoteVolume)}
                    </span>
                  </span>
                  <span className="flex flex-col items-end">
                    <PriceCell testId={`market-price-${tk.symbol}`} price={tk.lastPrice} text={fmt.price(tk.lastPrice, info.pricePrecision)} />
                    <span data-testid={`market-change-${tk.symbol}`} className={`font-mono text-row ${DIRECTION_CLASS[dir]}`}>
                      {fmt.percent(tk.priceChangePercent)}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
