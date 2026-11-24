import { useTranslation } from 'react-i18next';

/** Phase 0 placeholder; real pages arrive in later phases. */
export function PlaceholderPage({ page }: { page: 'trade' }) {
  const { t } = useTranslation();
  return (
    <section data-testid={`page-${page}`} className="mx-auto max-w-xl rounded-card border border-border bg-surface p-6">
      <h1 className="mb-2 text-page font-semibold">{t(`pages.${page}.title`)}</h1>
      <p className="text-text-muted">{t(`pages.${page}.placeholder`)}</p>
    </section>
  );
}
