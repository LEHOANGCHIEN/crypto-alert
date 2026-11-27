import { useTranslation } from 'react-i18next';

/** Placeholder until the full alerts page (AC-ALERT-12) replaces it. */
export function AlertsPage() {
  const { t } = useTranslation();
  return <h1 data-testid="alerts-page" className="text-section font-semibold">{t('nav.alerts')}</h1>;
}
