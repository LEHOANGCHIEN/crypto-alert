import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../shared/auth/auth.store';
import type { Locale } from '../../../shared/i18n';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { usePreferenceActions } from '../../usePreferenceActions';
import { UserMenu } from './UserMenu';
import { Bell } from '../../../features/notifications';

const LOCALES: Locale[] = ['vi', 'en'];

/** Right side of both headers: language, theme, bell + user menu (logged in) or Login/Register (guest). */
export function HeaderControls() {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const { changeLocale, changeTheme } = usePreferenceActions();
  const status = useAuth((s) => s.status);

  return (
    <>
      <div data-testid="lang-switcher" role="group" aria-label={t('language.label')} className="flex gap-1">
        {LOCALES.map((l) => (
          <button
            key={l}
            type="button"
            data-testid={`lang-${l}`}
            aria-pressed={i18n.language === l}
            onClick={() => changeLocale(l)}
            className={`h-8 X{
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
        className="h-8 rounded-button bg-surface-2 px-2 text-meta font-medium text-text sm:px-3"
      >
        {theme === 'dark' ? t('theme.dark') : t('theme.light')}
      </button>
      {status === 'authenticated' && <Bell />}
      {status === 'authenticated' && <UserMenu />}
      {status === 'guest' && (
        <nav className="flex gap-2">
          <Link to="/login" className="h-8 whitespace-nowrap rounded-button px-2 text-section leading-8 text-text sm:px-3">
            {t('nav.login')}
          </Link>
          <Link to="/register" className="h-8 whitespace-nowrap rounded-button bg-accent px-2 text-section font-medium leading-8 text-bg sm:px-3">
            {t('nav.register')}
          </Link>
        </nav>
      )}
    </>
  );
}
