import { useState, type CSSProperties, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { ResizeHandle } from '../../shared/layout/ResizeHandle';
import { useMaximized } from '../../shared/layout/maximize.store';
import { useLayout } from '../../shared/layout/layout.store';
import { MobileTabBar, type DashboardTab } from './MobileTabBar';
import { CollapseButton, Rail } from './PanelToggle';
import { SidePanel } from './SidePanel';
import { BottomPanel } from './BottomPanel';
import { useElementHeight } from '../../shared/layout/useElementHeight';

type Props = {
  market: (select: () => void) => ReactNode;
  chart: ReactNode;
};

/**
 * Desktop (≥ 1024 px): market list · chart · right panel, side columns resizable and collapsible (state in
 * `crypto-alert.layout`). Mobile: one panel at a time + bottom tab bar (ARCHITECTURE §11.1); the desktop-only
 * layout state never affects it.
 */
export function DashboardLayout({ market, chart }: Props) {
  const { t } = useTranslation();
  const [active, setActive] = useState<DashboardTab>('chart');
  const left = useLayout((s) => s.left);
  const right = useLayout((s) => s.right);
  const maximized = useMaximized((s) => s.maximized);
  const { symbol = 'BTCUSDT' } = useParams();
  const [centerRef, centerHeight] = useElementHeight<HTMLElement>();
  const show = (on: boolean) => (on ? 'flex' : 'hidden');
  // Column widths are passed as CSS variables so components carry no hard-coded pixel values.
  const vars = { '--dash-left': `${left.width}px`, '--dash-right': `${right.width}px` } as CSSProperties;

  return (
    <div data-testid="dashboard" style={vars} className="flex h-full min-h-0 flex-col lg:flex-row">
      {left.collapsed && <Rail side="left" />}
      <section
        data-testid="panel-market"
        className={`${show(active === 'markets')} min-h-0 w-full flex-1 flex-col bg-surface ${
          left.collapsed ? 'lg:hidden' : 'lg:flex lg:w-(--dash-left) lg:flex-none'
        }`}
      >
        <div className="hidden h-8 shrink-0 items-center justify-between border-b border-border px-3 lg:flex">
          <h2 className="text-section font-semibold">{t('dashboard.panels.markets')}</h2>
          <CollapseButton side="left" />
        </div>
        {market(() => setActive('chart'))}
      </section>
      {!left.collapsed && <ResizeHandle side="left" />}
      <section
        ref={centerRef}
        data-testid="panel-chart"
        data-maximized={maximized}
        className={`${show(active === 'chart')} min-h-0 min-w-0 flex-1 flex-col bg-bg lg:flex`}
      >
        {chart}
        {!maximized && <BottomPanel symbol={symbol} centerHeight={centerHeight} />}
      </section>
      {!right.collapsed && <ResizeHandle side="right" />}
      <section
        data-testid="panel-side"
        className={`${show(active === 'watchlist' || active === 'alerts')} min-h-0 w-full flex-1 flex-col bg-surface ${
          right.collapsed ? 'lg:hidden' : 'lg:flex lg:w-(--dash-right) lg:flex-none'
        }`}
      >
        <SidePanel active={active === 'alerts' ? 'alerts' : 'watchlist'} onChange={setActive} onSelect={() => setActive('chart')} />
      </section>
      {right.collapsed && <Rail side="right" />}
      <MobileTabBar active={active} onChange={setActive} />
    </div>
  );
}
