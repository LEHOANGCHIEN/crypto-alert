import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAuth } from '../../shared/auth/auth.store';
import { WatchlistPanel } from '../../features/watchlist';
import type { DashboardTab } from './MobileTabBar';

/** Right panel: Watchlist / Alerts. Watchlist (Phase 5) for users; the Alerts tab stays a placeholder until Phase 6. */
export function SidePanel({ active, onChange, onSelect }: { active: 'watchlist' | 'alerts'; onChange: (t: DashboardTab) => void; onSelect?: () => void }) {
  const { t } = useTranslation();
  const status = useAuth((s) => s.status);
  return (
    <>
      <div role="tablist" aria-label={t('dashboard.side.label')} className="hidden h-10 shrink-0 border-b border-border lg:flex">
        {(['watchlist', 'alerts'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            data-testid={`side-tab-${tab}`}
            aria-selected={active === tab}
            onClick={() => onChange(tab)}
            className={`flex-1 text-body font-medium ${active === tab ? 'border-b-2 border-accent text-text' : 'text-text-muted'}`}
          >
            {t(`dashboard.tabs.${tab}`)}
          </button>
        ))}
      </div>
      {status === 'authenticated' && active === 'watchlist' ? (
        <div data-testid="side-content-watchlist" className="flex min-h-0 flex-1 flex-col">
          <WatchlistPanel onSelect={onSelect} />
        </div>
      ) : (
        <div data-testid={`side-content-${active}`} className="flex flex-1 flex-col items-center justify-center gap-3 p-4 text-center">
          <h2 className="text-section font-semibold">{t(`dashboard.tabs.${active}`)}</h2>
          {status === 'guest' && (
            <>
              <p data-testid="login-prompt" className="text-text-muted">
                {t('dashboard.side.loginRequired')}
              </p>
              <Link to="/login" className="h-10 rounded-button bg-accent px-4 text-body font-medium leading-10 text-bg">
                {t('dashboard.side.login')}
              </Link>
            </>
          )}
          {status === 'authenticated' && <p className="text-text-muted">{t('dashboard.side.comingSoon')}</p>}
        </div>
      )}
    </>
  );
}
