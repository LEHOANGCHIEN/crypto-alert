import { useTranslation } from 'react-i18next';
import { MarketList } from '../../features/market/MarketList';
import { DashboardLayout } from '../dashboard/DashboardLayout';

/** `/trade/:symbol` — market list (left), chart (center), watchlist/alerts (right). */
export function TradePage() {
  const { t } = useTranslation();
  return (
    <DashboardLayout
      market={(select) => <MarketList onSelect={select} />}
      chart={<div className="p-4 text-text-muted">{t('dashboard.panels.chart')}</div>}
    />
  );
}
