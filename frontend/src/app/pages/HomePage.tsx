import { useTranslation } from 'react-i18next';

/** `/` — home (built up in Phase 7a item "Home v1"). */
export function HomePage() {
  const { t } = useTranslation();
  return (
    <div data-testid="page-home" className="mx-auto max-w-[1280px] px-8 py-12">
      <h1 className="text-auth-headline font-bold">{t('home.title')}</h1>
    </div>
  );
}
