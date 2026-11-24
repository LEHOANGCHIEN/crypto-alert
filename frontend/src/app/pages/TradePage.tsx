import { ChartPanel } from '../../features/chart/ChartPanel';
import { MarketList } from '../../features/market/MarketList';
import { DashboardLayout } from '../dashboard/DashboardLayout';
import { useLiveTickers } from '../../shared/market/useLiveMarket';

/** `/trade/:symbol` — market list (left), chart (center), watchlist/alerts (right). */
export function TradePage() {
  useLiveTickers();
  return (
    <DashboardLayout
      market={(select) => <MarketList onSelect={select} />}
      chart={<ChartPanel />}
    />
  );
}
