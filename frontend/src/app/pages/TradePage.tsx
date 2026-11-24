import { useTranslation } from 'react-i18next';
import { DashboardLayout } from '../dashboard/DashboardLayout';

/** `/trade/:symbol` — market list (left), chart (center), watchlist/alerts (right). Panels are filled in item by item. */
export function TradePage() {
  const { t } = useTranslation();
  return (
    <DashboardLayout
      market={() => <div className="p-4 text-text-muted">{t('dashboard.panels.markets')}</div>}
      chart={<div className="p-4 text-text-muted">{t('dashboard.panels.chart')}</div>}
    />
  );
}
