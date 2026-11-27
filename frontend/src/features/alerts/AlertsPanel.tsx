import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { errorText } from '../../shared/i18n/errorText';
import { AlertForm } from './AlertForm';
import { AlertList } from './AlertList';
import { MAX_ACTIVE_ALERTS } from './lib/distance';
import { useAlerts } from './useAlerts';

/** Right panel, Alerts tab (logged-in users): create form + Active / Triggered lists. */
export function AlertsPanel() {
  const { t } = useTranslation();
  const { symbol = 'BTCUSDT' } = useParams();
  const alerts = useAlerts();
  const all = alerts.data ?? [];

  return (
    <div data-testid="alerts-panel" className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <AlertForm key={symbol} chartSymbol={symbol} />
      <p data-testid="alerts-active-hint" className="hidden px-3 pb-2 text-meta text-text-muted lg:block">
        {t('alerts.hint', { count: all.filter((a) => a.status === 'ACTIVE').length, max: MAX_ACTIVE_ALERTS })}
      </p>
      {alerts.error ? (
        <div data-testid="alerts-error" className="flex flex-col items-center gap-3 p-4 text-center text-text-muted">
          <p>{errorText(t, alerts.error)}</p>
          <button type="button" onClick={() => void alerts.refetch()} className="h-8 rounded-button bg-surface-2 px-3 text-body text-text">
            {t('market.retry')}
          </button>
        </div>
      ) : alerts.isPending ? (
        <div data-testid="alerts-loading" aria-busy="true" className="flex flex-col gap-1 p-2">
          {Array.from({ length: 2 }, (_, i) => (
            <div key={i} className="h-row animate-pulse rounded-input bg-surface-2" />
          ))}
        </div>
      ) : (
        <>
          <AlertList kind="active" alerts={all.filter((a) => a.status === 'ACTIVE')} />
          <AlertList kind="triggered" alerts={all.filter((a) => a.status === 'TRIGGERED')} />
        </>
      )}
    </div>
  );
}
