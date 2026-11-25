import { useTranslation } from 'react-i18next';
import type { SymbolInfo, Ticker } from '../../shared/api/types';
import { priceDirection } from '../../shared/format';
import { useFormat } from '../../shared/format/useFormat';
import { StarButton } from '../watchlist';
import { coinName } from './coin-names';

const DIRECTION_CLASS = { up: 'text-up', down: 'text-down', flat: 'text-text-muted' } as const;

function Stat({ id, label, children, className = '' }: { id: string; label: string; children: string; className?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="truncate text-meta text-text-faint">{label}</span>
      <span data-testid={id} className={`truncate font-mono text-body ${className || 'text-text'}`}>
        {children}
      </span>
    </div>
  );
}

/** Chart header: avatar, pair (+ full name), star, 24 px last price and the 24h stats of the ticker. */
export function ChartHeaderStats({ symbol, info, ticker }: { symbol: string; info: SymbolInfo | undefined; ticker: Ticker | undefined }) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const dir = ticker ? priceDirection(ticker.priceChangePercent) : 'flat';
  const cls = DIRECTION_CLASS[dir];
  const p = info?.pricePrecision ?? 2;
  const name = info ? coinName(info.baseAsset) : undefined;
  const base = info?.baseAsset ?? '';
  const dash = '—';

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-x-6 gap-y-2 border-b border-border px-4 py-2">
      <div className="flex items-center gap-3">
        <span
          data-testid="chart-avatar"
          aria-hidden="true"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-3 text-section font-semibold text-text"
        >
          {base.slice(0, 1)}
        </span>
        <div className="flex flex-col">
          <div className="flex items-center gap-1">
            <h1 data-testid="chart-symbol" className="text-pair font-semibold leading-tight">
              {info ? `${info.baseAsset}/${info.quoteAsset}` : symbol}
            </h1>
            {info && <StarButton symbol={symbol} testId={`chart-star-${symbol}`} />}
          </div>
          {name && (
            <span data-testid="chart-name" className="text-meta text-text-faint">
              {name}
            </span>
          )}
        </div>
      </div>
      <span data-testid="chart-price" className={`font-mono text-price font-semibold leading-none ${cls}`}>
        {ticker && info ? fmt.price(ticker.lastPrice, p) : dash}
      </span>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-meta text-text-faint">{t('chart.stats.change')}</span>
          <span className={`flex gap-2 font-mono text-body ${cls}`}>
            <span data-testid="chart-change-abs">{ticker ? fmt.signedPrice(ticker.lastPrice - ticker.openPrice, p) : dash}</span>
            <span data-testid="chart-change">{ticker ? fmt.percent(ticker.priceChangePercent) : dash}</span>
          </span>
        </div>
        <Stat id="chart-high" label={t('chart.stats.high')}>
          {ticker ? fmt.price(ticker.highPrice, p) : dash}
        </Stat>
        <Stat id="chart-low" label={t('chart.stats.low')}>
          {ticker ? fmt.price(ticker.lowPrice, p) : dash}
        </Stat>
        <Stat id="chart-vol-base" label={t('chart.stats.volBase', { asset: base })}>
          {ticker ? fmt.price(ticker.volume, 2) : dash}
        </Stat>
        <Stat id="chart-vol-quote" label={t('chart.stats.volQuote')}>
          {ticker ? fmt.compact(ticker.quoteVolume) : dash}
        </Stat>
      </div>
    </div>
  );
}
