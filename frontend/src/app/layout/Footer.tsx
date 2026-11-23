import { useTranslation } from 'react-i18next';

export function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="shrink-0 border-t border-border bg-surface px-4 py-2 text-center text-meta text-text-muted">
      <p data-testid="footer-title">{t('footer.title')}</p>
      <p data-testid="footer-disclaimer">{t('footer.disclaimer')}</p>
      <p data-testid="footer-course">{t('footer.course')}</p>
    </footer>
  );
}
