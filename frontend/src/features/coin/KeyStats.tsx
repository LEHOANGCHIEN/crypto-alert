import { useTranslation } from 'react-i18next';
import type { SymbolInfo, Ticker } from '../../shared/api/types';
import { useFormat } from '../../shared/format/useFormat';

type Row = { key: string; label: string; value: string };

/** Key stats card (AC-COIN-04): 24h open/high/low/volumes from the ticker, 52-week high/low from the daily candles. */
export function KeyStats({ info, ticker, week52 }: { info: SymbolInfo; ticker: Ticker | undefined; week52: { high: number; low: number } | null }) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const p = info.pricePrecision;
  const dash = '—';
  const rows: Row[] = [
    { key: 'open', label: t('coin.stats.open'), value: ticker ? fmt.price(ticker.openPrice, p) : dash },
    { key: 'high', label: t('coin.stats.high'), value: ticker ? fmt.price(ticker.highPrice, p) : dash },
    { key: 'low', label: t('coin.stats.low'), value: ticker ? fmt.price(ticker.lowPrice, p) : dash },
    { key: 'volBase', label: t('coin.stats.volBase', { asset: info.baseAsset }), value: ticker ? fmt.price(ticker.volume, 2) : dash },
    { key: 'volQuote', label: t('coin.stats.volQuote'), value: ticker ? fmt.compact(ticker.quoteVolume) : dash },
    { key: 'high52', label: t('coin.stats.high52'), value: week52 ? fmt.price(week52.high, p) : dash },
    { key: 'low52', label: t('coin.stats.low52'), value: week52 ? fmt.price(week52.low, p) : dash },
  ];
  return (
    <section data-testid="coin-stats" aria-label={t('coin.stats.title')} className="rounded-card border border-border bg-surface p-5">
      <h2 className="mb-2 text-section font-semibold">{t('coin.stats.title')}</h2>
      <dl>
        {rows.map((r) => (
          <div key={r.key} className="flex items-center justify-between gap-3 border-b border-border py-3 last:border-b-0">
            <dt className="text-body text-text-muted">{r.label}</dt>
            <dd data-testid={`coin-stat-${r.key}`} className="font-mono text-body tabular-nums">
              {r.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
