import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { priceDirection } from '../../shared/format';
import { useFormat } from '../../shared/format/useFormat';
import { coinName } from '../../shared/market/coin-names';
import { useSymbols, useTickers } from '../../shared/market/queries';
import { Card } from '../../shared/ui/Card';
import { CoinAvatar } from '../../shared/ui/CoinAvatar';
import { Pill } from '../../shared/ui/Pill';
import { PriceCell } from '../../shared/ui/PriceCell';
import { SectionHeader } from '../../shared/ui/SectionHeader';
import { topMovers } from './lib';

const DIRECTION_CLASS = { up: 'text-up', down: 'text-down', flat: 'text-text-muted' } as const;

/** Movers: Gainers / Losers tabs, top 6 USDT pairs by 24h change %, each row links to `/coin/<SYMBOL>` (AC-SITE-01). */
export function Movers() {
  const { t } = useTranslation();
  const fmt = useFormat();
  const [kind, setKind] = useState<'gainers' | 'losers'>('gainers');
  const symbols = useSymbols();
  const tickers = useTickers();
  const rows = topMovers(tickers.data ?? [], kind).flatMap((ticker) => {
    const info = symbols.data?.find((x) => x.symbol === ticker.symbol);
    return info ? [{ info, ticker }] : [];
  });
  return (
    <section data-testid="home-movers" className="mt-14">
      <SectionHeader title={t('home.movers')}>
        <div role="tablist" aria-label={t('home.movers')} className="flex gap-2">
          <Pill testId="movers-tab-gainers" active={kind === 'gainers'} onClick={() => setKind('gainers')}>
            {t('home.gainers')}
          </Pill>
          <Pill testId="movers-tab-losers" active={kind === 'losers'} onClick={() => setKind('losers')}>
            {t('home.losers')}
          </Pill>
        </div>
      </SectionHeader>
      {tickers.isError || symbols.isError ? (
        <p data-testid="home-movers-unavailable" className="text-body text-text-muted">
          {t('home.unavailable')}
        </p>
      ) : (
        <Card testId="movers-list" className="divide-y divide-border">
          {rows.map(({ info, ticker }) => {
            const dir = priceDirection(ticker.priceChangePercent);
            return (
              <Link key={info.symbol} to={`/coin/${info.symbol}`} data-testid={`mover-row-${info.symbol}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2">
                <CoinAvatar baseAsset={info.baseAsset} size="lg" />
                <div className="flex flex-1 flex-col leading-tight">
                  <span className="text-section font-semibold text-text">{info.symbol}</span>
                  <span className="text-meta text-text-faint">{coinName(info.baseAsset) ?? info.baseAsset}</span>
                </div>
                <div className="flex flex-col items-end leading-tight">
                  <PriceCell testId={`mover-price-${info.symbol}`} price={ticker.lastPrice} text={fmt.price(ticker.lastPrice, info.pricePrecision)} />
                  <span data-testid={`mover-change-${info.symbol}`} className={`font-mono text-body ${DIRECTION_CLASS[dir]}`}>
                    {fmt.percent(ticker.priceChangePercent)}
                  </span>
                </div>
              </Link>
            );
          })}
        </Card>
      )}
    </section>
  );
}
