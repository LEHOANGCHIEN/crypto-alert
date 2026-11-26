import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../shared/auth/auth.store';
import type { Locale } from '../../shared/i18n';
import { useTheme } from '../../shared/theme/ThemeProvider';
import { usePreferenceActions } from '../usePreferenceActions';
import { UserMenu } from './UserMenu';
import { MarketStatusBadge } from './MarketStatusBadge';
import { Bell } from '../../features/notifications';

const LOCALES: Locale[] = ['vi', 'en'];

export function Header() {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const { changeLocale, changeTheme } = usePreferenceActions();
  const status = useAuth((s) => s.status);

  return (
    <header className="flex h-header shrink-0 items-center gap-4 border-b border-border bg-surface px-4">
      <Link to="/" data-testid="logo" className="flex items-center gap-2 text-section font-semibold text-text">
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6 text-accent" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 17l5-6 4 3 5-8 4 5" />
          <circle cx="20" cy="9" r="1.5" fill="currentColor" stroke="none" />
        </svg>
        {t('app.name')}
      </Link>
      <div className="flex-1" />
      <MarketStatusBadge />
      <div data-testid="lang-switcher" role="group" aria-label={t('language.label')} className="flex gap-1">
        {LOCALES.map((l) => (
          <button
            key={l}
            type="button"
            data-testid={`lang-${l}`}
            aria-pressed={i18n.language === l}
            onClick={() => changeLocale(l)}
            className={`h-8 rounded-button px-2 text-meta font-medium ${
              i18n.language === l ? 'bg-surface-3 text-text' : 'text-text-muted hover:bg-surface-2'
            }`}
          >
            {t(`language.${l}`)}
          </button>
        ))}
      </div>
      <button
        type="button"
        data-testid="theme-toggle"
        aria-label={t('theme.toggle')}
        title={t('theme.toggle')}
        onClick={() => changeTheme(theme === 'dark' ? 'light' : 'dark')}
        className="h-8 rounded-button bg-surface-2 px-3 text-meta font-medium text-text"
      >
        {theme === 'dark' ? t('theme.dark') : t('theme.light')}
      </button>
      {status === 'authenticated' && <Bell />}
      {status === 'authenticated' && <UserMenu />}
      {status === 'guest' && (
        <nav className="flex gap-2">
          <Link to="/login" className="h-8 rounded-button px-3 text-section leading-8 text-text">
            {t('nav.login')}
          </Link>
          <Link to="/register" className="h-8 rounded-button bg-accent px-3 text-section font-medium leading-8 text-bg">
            {t('nav.register')}
          </Link>
        </nav>
      )}
    </header>
  );
}
