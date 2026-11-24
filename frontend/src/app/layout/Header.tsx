import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../shared/auth/auth.store';
import type { Locale } from '../../shared/i18n';
import { useTheme } from '../../shared/theme/ThemeProvider';
import { usePreferenceActions } from '../usePreferenceActions';
import { UserMenu } from './UserMenu';
import { MarketStatusBadge } from './MarketStatusBadge';

const LOCALES: Locale[] = ['vi', 'en'];

export function Header() {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const { changeLocale, changeTheme } = usePreferenceActions();
  const status = useAuth((s) => s.status);

  return (
    <header className="flex h-header shrink-0 items-center gap-4 border-b border-border bg-surface px-4">
      <Link to="/" data-testid="logo" className="text-section font-semibold text-text">
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
              i18n.language === l ? 'bg-accent text-bg' : 'bg-surface-2 text-text-muted'
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
      {status === 'authenticated' && <UserMenu />}
      {status === 'guest' && (
        <nav className="flex gap-2">
          <Link to="/login" className="h-8 rounded-button px-3 text-body leading-8 text-text">
            {t('nav.login')}
          </Link>
          <Link to="/register" className="h-8 rounded-button bg-accent px-3 text-body font-medium leading-8 text-bg">
            {t('nav.register')}
          </Link>
        </nav>
      )}
    </header>
  );
}
