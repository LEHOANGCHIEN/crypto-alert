import { useTranslation } from 'react-i18next';
import { useConnection } from '../../shared/socket/connection.store';

/** Header badge while the upstream market data feed is reconnecting (API.md §4.3 `market:status`). */
export function MarketStatusBadge() {
  const { t } = useTranslation();
  const status = useConnection((s) => s.marketStatus);
  if (status !== 'reconnecting') return null;
  return (
    <span
      data-testid="market-status-badge"
      role="status"
      className="h-6 rounded-button border border-warning px-2 text-meta font-medium leading-6 text-warning"
    >
      {t('market.status.reconnecting')}
    </span>
  );
}
