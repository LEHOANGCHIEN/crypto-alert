import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <section data-testid="page-not-found" className="mx-auto max-w-xl py-16 text-center">
      <h1 className="mb-2 text-page font-semibold">{t('pages.notFound.title')}</h1>
      <p className="mb-6 text-text-muted">{t('pages.notFound.description')}</p>
      <Link to="/" className="inline-block h-10 rounded-button bg-accent px-4 text-body font-medium leading-10 text-bg">
        {t('nav.home')}
      </Link>
    </section>
  );
}
