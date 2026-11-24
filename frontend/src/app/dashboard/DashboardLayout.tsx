import { useState, type ReactNode } from 'react';
import { MobileTabBar, type DashboardTab } from './MobileTabBar';
import { SidePanel } from './SidePanel';

type Props = {
  market: (select: () => void) => ReactNode;
  chart: ReactNode;
};

/** Desktop (≥ 1024 px): market list · chart · right panel. Mobile: one panel at a time + bottom tab bar (ARCHITECTURE §11.1). */
export function DashboardLayout({ market, chart }: Props) {
  const [active, setActive] = useState<DashboardTab>('chart');
  const show = (on: boolean) => (on ? 'flex' : 'hidden');

  return (
    <div data-testid="dashboard" className="flex h-full min-h-0 flex-col lg:flex-row">
      <section
        data-testid="panel-market"
        className={`${show(active === 'markets')} min-h-0 w-full flex-1 flex-col border-border bg-surface lg:flex lg:w-panel-left lg:flex-none lg:border-r`}
      >
        {market(() => setActive('chart'))}
      </section>
      <section
        data-testid="panel-chart"
        className={`${show(active === 'chart')} min-h-0 min-w-0 flex-1 flex-col bg-surface lg:flex`}
      >
        {chart}
      </section>
      <section
        data-testid="panel-side"
        className={`${show(active === 'watchlist' || active === 'alerts')} min-h-0 w-full flex-1 flex-col border-border bg-surface lg:flex lg:w-panel-right lg:flex-none lg:border-l`}
      >
        <SidePanel active={active === 'alerts' ? 'alerts' : 'watchlist'} onChange={setActive} />
      </section>
      <MobileTabBar active={active} onChange={setActive} />
    </div>
  );
}
