import { useTranslation } from 'react-i18next';

export type DashboardTab = 'markets' | 'chart' | 'watchlist' | 'alerts';
const TABS: DashboardTab[] = ['markets', 'chart', 'watchlist', 'alerts'];

/** Bottom tab bar, visible below 1024 px only. */
export function MobileTabBar({ active, onChange }: { active: DashboardTab; onChange: (t: DashboardTab) => void }) {
  const { t } = useTranslation();
  return (
    <nav
      data-testid="mobile-tabs"
      aria-label={t('dashboard.tabs.label')}
      className="flex h-tabbar shrink-0 border-t border-border bg-surface lg:hidden"
    >
      {TABS.map((tab) => (
        <button
          key={tab}
          type="button"
          data-testid={`tab-${tab}`}
          aria-current={active === tab ? 'page' : undefined}
          onClick={() => onChange(tab)}
          className={`flex-1 text-meta font-medium ${active === tab ? 'text-accent' : 'text-text-muted'}`}
        >
          {t(`dashboard.tabs.${tab}`)}
        </button>
      ))}
    </nav>
  );
}
