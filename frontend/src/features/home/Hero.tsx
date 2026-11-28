import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSearch } from '../../shared/search/search.store';

/** Home hero (docs/design/v2/01-home.png): headline, subline, large search field, "Open Supercharts". */
export function Hero() {
  const { t } = useTranslation();
  const show = useSearch((s) => s.show);
  return (
    <section data-testid="home-hero" className="flex flex-col items-center gap-6 pb-4 pt-10 text-center lg:pt-16">
      <h1 data-testid="home-title" className="max-w-3xl text-4xl font-extrabold leading-tight text-text lg:text-hub">
        {t('home.title')}
      </h1>
      <p className="max-w-2xl text-section text-text-muted">{t('home.subtitle')}</p>
      <input
        type="search"
        data-testid="home-search"
        aria-label={t('search.title')}
        placeholder={t('home.searchPlaceholder')}
        value=""
        onChange={(e) => show(e.currentTarget, e.target.value)}
        className="h-12 w-full max-w-xl rounded-full border border-border bg-surface px-6 text-section text-text placeholder:text-text-faint"
      />
      <Link
        to="/chart/BTCUSDT"
        data-testid="home-open-chart"
        className="flex h-11 items-center rounded-full bg-accent px-6 text-section font-semibold text-bg"
      >
        {t('home.openChart')}
      </Link>
    </section>
  );
}
