import { useConnection } from '../../shared/socket/connection.store';
import { useLiveTickers } from '../../shared/market/useLiveMarket';
import { Hero } from '../../features/home/Hero';
import { MarketSummary } from '../../features/home/MarketSummary';
import { Movers } from '../../features/home/Movers';

/** `/` — home (F14, docs/design/v2/01-home.png): hero, market summary, movers. Real data only. */
export function HomePage() {
  useLiveTickers();
  const live = useConnection((s) => s.tickersLive);
  return (
    <div data-testid="page-home" data-live={String(live)} className="mx-auto w-full max-w-site px-0 sm:px-4 lg:px-8">
      <Hero />
      <MarketSummary />
      <Movers />
    </div>
  );
}
