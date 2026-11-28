import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

/** Logo + app name; links to the home page (`/`). */
export function Logo() {
  const { t } = useTranslation();
  return (
    <Link to="/" data-testid="logo" aria-label={t('app.name')} className="flex items-center gap-2 text-section font-semibold text-text">
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6 text-accent" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 17l5-6 4 3 5-8 4 5" />
        <circle cx="20" cy="9" r="1.5" fill="currentColor" stroke="none" />
      </svg>
      <span className="hidden sm:inline">{t('app.name')}</span>
    </Link>
  );
}
