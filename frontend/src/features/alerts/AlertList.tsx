import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { Alert } from '../../shared/api/types';
import { useFormat } from '../../shared/format/useFormat';
import { useSymbols } from '../../shared/market/queries';
import { useDeleteAlert } from './useAlerts';

const DEFAULT_PRECISION = 2;

/** Active or Triggered alerts, each with a delete button (AC-ALERT-01/03/06). */
export function AlertList({ kind, alerts }: { kind: 'active' | 'triggered'; alerts: Alert[] }) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const symbols = useSymbols();
  const remove = useDeleteAlert();
  const precision = useMemo(() => new Map((symbols.data ?? []).map((s) => [s.symbol, s.pricePrecision])), [symbols.data]);
  const price = (symbol: string, v: number) => fmt.price(v, precision.get(symbol) ?? DEFAULT_PRECISION);

  return (
    <section aria-labelledby={`alerts-${kind}-title`} className="flex flex-col">
      <h3 id={`alerts-${kind}-title`} className="px-3 pb-1 pt-3 text-meta font-semibold uppercase text-text-muted">
        {t(`alerts.${kind}`)}
      </h3>
      {alerts.length === 0 ? (
        <p data-testid={`alerts-${kind}-empty`} className="px-3 py-2 text-meta text-text-muted">
          {t(`alerts.empty.${kind}`)}
        </p>
      ) : (
        <ul data-testid={`alerts-${kind}`}>
          {alerts.map((a) => (
            <li key={a.id} data-testid={`alert-row-${a.id}`} data-status={a.status} className="flex items-start gap-2 border-b border-border px-3 py-2 text-row">
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span data-testid="alert-row-symbol" className="font-semibold">
                    {a.symbol}
                  </span>
                  <span data-testid="alert-row-condition" className="text-text-muted">
                    {t(`alerts.condition.${a.condition}`)}
                  </span>
                  <span data-testid="alert-row-target" className="tabular-nums">
                    {price(a.symbol, a.targetPrice)}
                  </span>
                </div>
                {a.status === 'TRIGGERED' && a.triggeredPrice !== null && a.triggeredAt !== null ? (
                  <div className="text-meta text-text-muted">
                    <span>{t('alerts.triggeredPrice')}</span>{' '}
                    <span data-testid="alert-triggered-price" className="tabular-nums text-text">
                      {price(a.symbol, a.triggeredPrice)}
                    </span>{' '}
                    <span data-testid="alert-triggered-at" className="tabular-nums">
                      {fmt.dateTime(Date.parse(a.triggeredAt))}
                    </span>
                  </div>
                ) : (
                  <div className="text-meta text-text-muted">
                    <span>{t('alerts.createdAt')}</span>{' '}
                    <span data-testid="alert-created-at" className="tabular-nums">
                      {fmt.dateTime(Date.parse(a.createdAt))}
                    </span>
                  </div>
                )}
              </div>
              <button
                type="button"
                data-testid={`alert-delete-${a.id}`}
                aria-label={t('alerts.delete', { symbol: a.symbol })}
                title={t('alerts.delete', { symbol: a.symbol })}
                disabled={remove.isPending && remove.variables === a.id}
                onClick={() => remove.mutate(a.id)}
                className="h-7 w-7 shrink-0 rounded-button text-text-muted hover:bg-surface-2 hover:text-danger"
              >
                <span aria-hidden="true">×</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
