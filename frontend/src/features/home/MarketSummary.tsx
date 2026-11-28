import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { priceDirection } from '../../shared/format';
import { useFormat } from '../../shared/format/useFormat';
import { coinName } from '../../shared/market/coin-names';
import { useSymbols, useTickers } from '../../shared/market/queries';
import { Card } from '../../shared/ui/Card';
import { CoinAvatar } from '../../shared/ui/CoinAvatar';
import { PriceCell } from '../../shared/ui/PriceCell';
import { SectionHeader } from '../../shared/ui/SectionHeader';
import { Sparkline } from '../../shared/ui/Sparkline';
import { SUMMARY_SYMBOLS } from './lib';
import { useSparkline } from './useSparkline';

const DIRECTION_CLASS = { up: 'text-up', down: 'text-down', flat: 'text-text-muted' } as const;

function SummaryCard({ symbol, baseAsset, precision, lastPrice, change }: { symbol: string; baseAsset: string; precision: number; lastPrice: number; change: number }) {
  const fmt = useFormat();
  const klines = useSparkline(symbol);
  const closes = (klines.data ?? []).map((c) => c.close);
  const first = closes[0];
  const last = closes[closes.length - 1];
  const ownChange = first !== undefined && last !== undefined && first !== 0 ? ((last - first) / first) * 100 : 0;
  const dir = priceDirection(change);
  return (
    <Link to={`/coin/${symbol}`} data-testid={`summary-card-${symbol}`} data-direction={dir} className="block">
      <Card className="flex h-full flex-col gap-3 p-4 hover:bg-surface-2">
        <div className="flex items-center gap-3">
          <CoinAvatar baseAsset={baseAsset} size="lg" testId={`summary-avatar-${symbol}`} />
          <div className="flex flex-col leading-tight">
            <span data-testid={`summary-name-${symbol}`} className="text-section font-semibold text-text">
              {coinName(baseAsset) ?? baseAsset}
            </span>
            <span className="text-meta text-text-faint">{symbol}</span>
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <PriceCell testId={`summary-price-${symbol}`} price={lastPrice} text={fmt.price(lastPrice, precision)} />
          <span data-testid={`summary-change-${symbol}`} className={`font-mono text-body ${DIRECTION_CLASS[dir]}`}>
            {fmt.percent(change)}
          </span>
        </div>
        <Sparkline testId={`summary-spark-${symbol}`} values={closes} direction={priceDirection(ownChange)} />
      </Card>
    </Link>
  );
}

/** Market summary: cards for BTC, ETH, BNB, SOL (pairs missing from the tickers are skipped) — AC-SITE-01. */
export function MarketSummary() {
  const { t } = useTranslation();
  const symbols = useSymbols();
  const tickers = useTickers();
  const cards = SUMMARY_SYMBOLS.flatMap((s) => {
    const info = symbols.data?.find((x) => x.symbol === s);
    const ticker = tickers.data?.find((x) => x.symbol === s);
    return info && ticker ? [{ info, ticker }] : [];
  });
  return (
    <section data-testid="home-summary" className="mt-14">
      <SectionHeader title={t('home.summary')} />
      {tickers.isError || symbols.isError ? (
        <p data-testid="home-summary-unavailable" className="text-body text-text-muted">
          {t('home.unavailable')}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map(({ info, ticker }) => (
            <SummaryCard key={info.symbol} symbol={info.symbol} baseAsset={info.baseAsset} precision={info.pricePrecision} lastPrice={ticker.lastPrice} change={ticker.priceChangePercent} />
          ))}
        </div>
      )}
    </section>
  );
}
