import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSearch } from '../../../shared/search/search.store';
import { HeaderControls } from '../common/HeaderControls';
import { Logo } from '../common/Logo';
import { MarketStatusBadge } from '../common/MarketStatusBadge';

/** Compact chart header (AC-UI-01): logo → `/`, pair selector, status badge, language, theme, bell, user menu / login. */
export function ChartHeader() {
  const { t } = useTranslation();
  const { symbol = '' } = useParams();
  const show = useSearch((s) => s.show);
  return (
    <header data-testid="chart-header" className="flex h-header shrink-0 items-center gap-1 border-b border-border bg-surface px-3 sm:gap-2 lg:gap-4 lg:px-4">
      <Logo />
      <button
        type="button"
        data-testid="chart-pair-select"
        aria-label={t('search.pair')}
        onClick={(e) => show(e.currentTarget)}
        className="flex h-8 items-center gap-1 rounded-button bg-surface-2 px-2 text-section font-semibold sm:px-3 text-text hover:bg-surface-3"
      >
        {symbol.toUpperCase()}
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      <div className="flex-1" />
      <MarketStatusBadge />
      <HeaderControls />
    </header>
  );
}
