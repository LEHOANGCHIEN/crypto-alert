import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useFormat } from '../../shared/format/useFormat';
import { useSymbols, useTickers } from '../../shared/market/queries';
import { distancePercent, MAX_ACTIVE_ALERTS, NewAlertDialog, useAlerts, useDeleteAlert } from '../../features/alerts';

type Filter = 'all' | 'active' | 'triggered';
const FILTERS: Filter[] = ['all', 'active', 'triggered'];
const DEFAULT_PRECISION = 2;

const TH = 'px-4 py-3 text-left text-meta font-medium uppercase text-text-faint';
const TD = 'px-4 py-4 text-body';

/** `/alerts` (AC-ALERT-12): all of the user's alerts, status filter, symbol search, new-alert dialog, delete. */
export function AlertsPage() {
  const { t } = useTranslation();
  const fmt = useFormat();
  const alerts = useAlerts();
  const symbols = useSymbols();
  const tickers = useTickers();
  const remove = useDeleteAlert();
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [dialog, setDialog] = useState(false);

  const pairs = useMemo(() => new Map((symbols.data ?? []).map((s) => [s.symbol, s])), [symbols.data]);
  const last = useMemo(() => new Map((tickers.data ?? []).map((x) => [x.symbol, x.lastPrice])), [tickers.data]);
  const all = alerts.data ?? [];
  const needle = search.trim().toUpperCase().replace('/', '');
  const bySearch = all.filter((a) => a.symbol.includes(needle));
  const counts = {
    all: bySearch.length,
    active: bySearch.filter((a) => a.status === 'ACTIVE').length,
    triggered: bySearch.filter((a) => a.status === 'TRIGGERED').length,
  };
  const rows = bySearch.filter((a) => filter === 'all' || a.status === filter.toUpperCase());
  const totalActive = all.filter((a) => a.status === 'ACTIVE').length;
  const totalTriggered = all.length - totalActive;
  const price = (symbol: string, v: number) => fmt.price(v, pairs.get(symbol)?.pricePrecision ?? DEFAULT_PRECISION);

  return (
    <div data-testid="alerts-page" data-fetching={String(alerts.isFetching)} className="mx-auto flex w-full max-w-screen-2xl flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-price font-semibold">{t('alertsPage.title')}</h1>
          <p data-testid="alerts-summary" className="text-body text-text-muted">
            {t('alertsPage.summary', { active: totalActive, triggered: totalTriggered, max: MAX_ACTIVE_ALERTS })}
          </p>
        </div>
        <button
          type="button"
          data-testid="alerts-new-button"
          onClick={() => setDialog(true)}
          className="h-9 rounded-button bg-accent px-4 text-section font-medium text-bg"
        >
          + {t('alertsPage.new')}
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label={t('alertsPage.filterLabel')} className="flex gap-1 rounded-card border border-border bg-surface p-1">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              role="tab"
              data-testid={`alerts-filter-${f}`}
              aria-selected={filter === f}
              onClick={() => setFilter(f)}
              className={`h-8 rounded-input px-3 text-section ${filter === f ? 'bg-surface-3 font-medium text-text' : 'text-text-muted hover:text-text'}`}
            >
              {t(`alertsPage.filters.${f}`, { count: counts[f] })}
            </button>
          ))}
        </div>
        <input
          type="search"
          data-testid="alerts-search"
          aria-label={t('alertsPage.searchLabel')}
          placeholder={t('alertsPage.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 w-full rounded-input border border-border bg-surface-2 px-3 text-body text-text sm:w-72"
        />
      </div>

      {alerts.isPending ? (
        <p className="text-body text-text-muted">{t('common.loading')}</p>
      ) : rows.length === 0 ? (
        <div data-testid="alerts-page-empty" className="rounded-card border border-border bg-surface p-6 text-body text-text-muted">
          <p>{t(all.length === 0 ? 'alertsPage.empty' : 'alertsPage.emptyFiltered')}</p>
          {all.length === 0 && (
            <Link to="/chart/BTCUSDT" data-testid="alerts-empty-link" className="mt-2 inline-block font-medium text-accent">
              {t('alertsPage.emptyLink')}
            </Link>
          )}
        </div>
      ) : (
        <div className="relative overflow-x-auto rounded-card border border-border bg-surface">
          <table data-testid="alerts-table" className="w-full min-w-3xl border-collapse">
            <thead>
              <tr className="border-b border-border bg-surface-2">
                <th className={TH}>{t('bottomPanel.columns.pair')}</th>
                <th className={TH}>{t('bottomPanel.columns.condition')}</th>
                <th className={TH}>{t('bottomPanel.columns.target')}</th>
                <th className={TH}>{t('bottomPanel.columns.current')}</th>
                <th className={TH}>{t('bottomPanel.columns.distance')}</th>
                <th className={TH}>{t('alertsPage.columns.status')}</th>
                <th className={TH}>{t('bottomPanel.columns.createdAt')}</th>
                <th className={TH}>{t('bottomPanel.columns.triggeredAt')}</th>
                <th className={TH}>
                  <span className="sr-only">{t('bottomPanel.columns.actions')}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => {
                const info = pairs.get(a.symbol);
                const current = last.get(a.symbol);
                const distance = a.status === 'ACTIVE' ? distancePercent(a.targetPrice, current) : null;
                const active = a.status === 'ACTIVE';
                return (
                  <tr key={a.id} data-testid={`alerts-row-${a.id}`} data-status={a.status} className="border-b border-border last:border-b-0">
                    <td className={`${TD} font-semibold`}>
                      <Link to={`/chart/${a.symbol}`} data-testid="alerts-row-symbol" data-symbol={a.symbol} className="hover:text-accent">
                        {info ? `${info.baseAsset}/${info.quoteAsset}` : a.symbol}
                      </Link>
                    </td>
                    <td data-testid="alerts-row-condition" className={`${TD} text-text-muted`}>
                      {t(`alerts.condition.${a.condition}`)}
                    </td>
                    <td data-testid="alerts-row-target" className={`${TD} font-mono tabular-nums`}>
                      {price(a.symbol, a.targetPrice)}
                    </td>
                    <td data-testid="alerts-row-current" className={`${TD} font-mono tabular-nums`}>
                      {current === undefined ? '—' : price(a.symbol, current)}
                    </td>
                    <td data-testid="alerts-row-distance" className={`${TD} font-mono tabular-nums text-text-muted`}>
                      {distance === null ? '—' : fmt.percent(distance)}
                    </td>
                    <td className={TD}>
                      <span
                        data-testid="alerts-row-status"
                        className={`rounded-chip px-2 py-1 text-meta font-medium ${active ? 'bg-accent/15 text-accent' : 'bg-surface-3 text-text-muted'}`}
                      >
                        {t(active ? 'alertsPage.status.ACTIVE' : 'alertsPage.status.TRIGGERED')}
                      </span>
                    </td>
                    <td data-testid="alerts-row-created" className={`${TD} font-mono tabular-nums text-text-muted`}>
                      {fmt.dateTime(Date.parse(a.createdAt))}
                    </td>
                    <td data-testid="alerts-row-triggered-at" className={`${TD} font-mono tabular-nums text-text-muted`}>
                      {a.triggeredAt ? fmt.dateTime(Date.parse(a.triggeredAt)) : '—'}
                    </td>
                    <td className={`${TD} text-right`}>
                      <button
                        type="button"
                        data-testid={`alerts-delete-${a.id}`}
                        aria-label={t('alerts.delete', { symbol: a.symbol })}
                        title={t('alerts.delete', { symbol: a.symbol })}
                        disabled={remove.isPending && remove.variables === a.id}
                        onClick={() => remove.mutate(a.id)}
                        className="h-7 w-7 rounded-button text-text-muted hover:bg-surface-2 hover:text-danger"
                      >
                        <span aria-hidden="true">×</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {dialog && <NewAlertDialog defaultSymbol="BTCUSDT" onClose={() => setDialog(false)} />}
    </div>
  );
}
