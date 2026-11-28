import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import type { SymbolInfo, Ticker } from '../../shared/api/types';
import { priceDirection } from '../../shared/format';
import { useFormat } from '../../shared/format/useFormat';
import { coinName } from '../chart';
import { StarButton } from '../watchlist';

const DIRECTION_CLASS = { up: 'text-up', down: 'text-down', flat: 'text-text-muted' } as const;

/** Coin overview header (AC-COIN-01): avatar, name, pair, star, big price, 24h change, updated-at, "Open full chart". */
export function CoinHeader({ symbol, info, ticker }: { symbol: string; info: SymbolInfo; ticker: Ticker | undefined }) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const dir = ticker ? priceDirection(ticker.priceChangePercent) : 'flat';
  const cls = DIRECTION_CLASS[dir];
  const p = info.pricePrecision;
  const name = coinName(info.baseAsset) ?? info.baseAsset;
  const dash = '—';

  return (
    <header data-testid="coin-header" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-4">
          <span data-testid="coin-avatar" aria-hidden="true" className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-surface-3 text-page font-semibold">
            {info.baseAsset.slice(0, 1)}
          </span>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h1 data-testid="coin-name" className="text-page font-semibold leading-tight">
                {name}
              </h1>
              <StarButton symbol={symbol} testId={`coin-star-${symbol}`} />
            </div>
            <span data-testid="coin-pair" className="text-body text-text-muted">
              {t('coin.spot', { pair: `${info.baseAsset}/${info.quoteAsset}` })}
            </span>
          </div>
        </div>
        <Link to={`/chart/${symbol}`} data-testid="coin-open-chart" className="h-9 rounded-button border border-border bg-surface-2 px-4 text-body font-medium leading-9 text-text hover:bg-surface-3">
          {t('coin.openChart')} ↗
        </Link>
      </div>
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <span data-testid="coin-price" className="font-mono text-coin-price font-semibold leading-none text-text">
          {ticker ? fmt.price(ticker.lastPrice, p) : dash}
        </span>
        <span className="text-section text-text-muted">{info.quoteAsset}</span>
        <span className={`flex gap-3 font-mono text-section ${cls}`}>
          <span data-testid="coin-change-abs">{ticker ? fmt.signedPrice(ticker.lastPrice - ticker.openPrice, p) : dash}</span>
          <span data-testid="coin-change">{ticker ? fmt.percent(ticker.priceChangePercent) : dash}</span>
        </span>
      </div>
      <p data-testid="coin-updated" className="text-body text-text-faint">
        {ticker ? t('coin.updatedAt', { time: fmt.time(ticker.eventTime), zone: fmt.gmtOffset(ticker.eventTime) }) : dash}
      </p>
    </header>
  );
}
