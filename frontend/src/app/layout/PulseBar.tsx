import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import { parseInterval } from '../../features/chart/TimeframeBar';
import { priceDirection } from '../../shared/format';
import { useFormat } from '../../shared/format/useFormat';
import { useSymbols, useTickers } from '../../shared/market/queries';
import { PriceCell } from '../../shared/ui/PriceCell';

export const PULSE_SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'DOGEUSDT'] as const;
const DIRECTION_CLASS = { up: 'text-up', down: 'text-down', flat: 'text-text-muted' } as const;

/** Market pulse bar under the header (≥ 1024 px): six major pairs, live, click opens the chart on the current timeframe. */
export function PulseBar() {
  const { t } = useTranslation();
  const fmt = useFormat();
  const [params] = useSearchParams();
  const symbols = useSymbols();
  const tickers = useTickers();
  const tf = parseInterval(params.get('tf'));
  const items = PULSE_SYMBOLS.flatMap((s) => {
    const info = symbols.data?.find((x) => x.symbol === s);
    const ticker = tickers.data?.find((x) => x.symbol === s);
    return info && ticker ? [{ info, ticker }] : [];
  });

  return (
    <div
      data-testid="pulse-bar"
      className="hidden h-pulse shrink-0 items-center gap-3 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden border-b border-border bg-surface px-4 text-row lg:flex xl:gap-6"
    >
      <span className="hidden shrink-0 text-meta font-semibold uppercase tracking-wide text-text-faint xl:inline">{t('statusBar.pulse')}</span>
      {items.map(({ info, ticker }) => {
        const dir = priceDirection(ticker.priceChangePercent);
        return (
          <Link
            key={info.symbol}
            to={`/trade/${info.symbol}?tf=${tf}`}
            data-testid={`pulse-item-${info.symbol}`}
            data-direction={dir}
            className="flex shrink-0 items-center gap-2 rounded-chip px-1 hover:bg-surface-3"
          >
            <span className="text-text-muted">
              {info.baseAsset}/{info.quoteAsset}
            </span>
            <PriceCell testId={`pulse-price-${info.symbol}`} price={ticker.lastPrice} text={fmt.price(ticker.lastPrice, info.pricePrecision)} />
            <span data-testid={`pulse-change-${info.symbol}`} className={`font-mono ${DIRECTION_CLASS[dir]}`}>
              {fmt.percent(ticker.priceChangePercent)}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
