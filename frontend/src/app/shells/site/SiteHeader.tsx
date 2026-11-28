import { useTranslation } from 'react-i18next';
import { useIsDesktop } from '../../../shared/nav/useIsDesktop';
import { useSearch } from '../../../shared/search/search.store';
import { HeaderControls } from '../common/HeaderControls';
import { Logo } from '../common/Logo';
import { MegaMenu } from './MegaMenu';
import { MobileDrawer } from './MobileDrawer';

/** Site header (64 px, all site pages): logo, search (Ctrl+K), top menus, language, theme, bell, user (AC-UI-09). */
export function SiteHeader() {
  const { t } = useTranslation();
  const desktop = useIsDesktop();
  const show = useSearch((s) => s.show);
  return (
    <header data-testid="site-header" className="flex h-site-header shrink-0 items-center gap-1 border-b border-border bg-bg px-3 sm:gap-2 lg:gap-4 lg:px-6">
      <Logo />
      <button
        type="button"
        data-testid="search-trigger"
        aria-label={t('search.open')}
        onClick={(e) => show(e.currentTarget)}
        className="flex h-9 items-center gap-2 rounded-full border border-border bg-surface-2 px-3 text-body text-text-muted hover:bg-surface-3 lg:w-64"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-4-4" />
        </svg>
        <span className="hidden lg:inline">{t('search.open')}</span>
      </button>
      {desktop ? <MegaMenu /> : <MobileDrawer />}
      <div className="flex-1" />
      <HeaderControls />
    </header>
  );
}
