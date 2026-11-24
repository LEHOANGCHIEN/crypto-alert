import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useVirtualizer } from '@tanstack/react-virtual';
import { priceDirection } from '../../shared/format';
import { useFormat } from '../../shared/format/useFormat';
import { errorText } from '../../shared/i18n/errorText';
import { useSymbols, useTickers } from '../../shared/market/queries';

const DIRECTION_CLASS = { up: 'text-up', down: 'text-down', flat: 'text-text-muted' } as const;

/** Left panel: search + virtualised list of USDT pairs, default order = 24h quote volume desc. */
export function MarketList({ onSelect }: { onSelect?: () => void }) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const navigate = useNavigate();
  const { symbol: current = '' } = useParams();
  const [params] = useSearchParams();
  const [query, setQuery] = useState('');
  const symbols = useSymbols();
  const tickers = useTickers();
  const scrollRef = useRef<HTMLDivElement>(null);

  const precision = useMemo(() => new Map((symbols.data ?? []).map((s) => [s.symbol, s])), [symbols.data]);
  const rows = useMemo(() => {
    const q = query.trim().toUpperCase();
    return (tickers.data ?? []).filter((x) => precision.has(x.symbol) && (q === '' || x.symbol.includes(q)));
  }, [tickers.data, precision, query]);

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Virtual is not memoisation-safe; the list is not memoised
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 32,
    overscan: 10,
    // Fallback so the first rows render even before the scroll container has been measured.
    initialRect: { width: 320, height: 640 },
  });

  const error = symbols.error ?? tickers.error;
  const loading = symbols.isPending || tickers.isPending;

  const open = (symbol: string) => {
    const tf = params.get('tf');
    navigate(`/trade/${symbol}${tf ? `?tf=${encodeURIComponent(tf)}` : ''}`);
    onSelect?.();
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-border p-2">
        <input
          type="search"
          data-testid="market-search"
          aria-label={t('market.search.label')}
          placeholder={t('market.search.placeholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-10 w-full rounded-input border border-border bg-surface-2 px-3 text-body text-text placeholder:text-text-muted"
        />
      </div>
      <div
        data-testid="market-columns"
        className="grid shrink-0 grid-cols-[1.2fr_1fr_0.9fr_0.9fr] gap-2 border-b border-border px-3 py-1 text-meta text-text-muted"
      >
        <span>{t('market.columns.pair')}</span>
        <span className="text-right">{t('market.columns.price')}</span>
        <span className="text-right">{t('market.columns.change')}</span>
        <span className="text-right">{t('market.columns.volume')}</span>
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
      ) : rows.length === 0 ? (
        <p data-testid="market-empty" className="p-4 text-center text-text-muted">
          {t('market.empty')}
        </p>
      ) : (
        <div ref={scrollRef} role="listbox" aria-label={t('market.list')} data-testid="market-list" className="min-h-0 flex-1 overflow-y-auto">
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
                  className={`absolute left-0 top-0 grid w-full cursor-pointer grid-cols-[1.2fr_1fr_0.9fr_0.9fr] items-center gap-2 px-3 text-row hover:bg-surface-2 ${
                    selected ? 'bg-surface-2' : ''
                  }`}
                  style={{ height: v.size, transform: `translateY(${v.start}px)` }}
                >
                  <span className="truncate font-medium">
                    {info.baseAsset}
                    <span className="text-text-muted">/{info.quoteAsset}</span>
                  </span>
                  <span data-testid={`market-price-${tk.symbol}`} className="text-right">
                    {fmt.price(tk.lastPrice, info.pricePrecision)}
                  </span>
                  <span data-testid={`market-change-${tk.symbol}`} className={`text-right ${DIRECTION_CLASS[dir]}`}>
                    {fmt.percent(tk.priceChangePercent)}
                  </span>
                  <span data-testid={`market-volume-${tk.symbol}`} className="text-right text-text-muted">
                    {fmt.compact(tk.quoteVolume)}
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
