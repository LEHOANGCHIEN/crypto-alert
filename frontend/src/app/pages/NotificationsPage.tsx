import { useTranslation } from 'react-i18next';

/** Placeholder until the full notifications page (AC-NOTIF-06) replaces it. */
export function NotificationsPage() {
  const { t } = useTranslation();
  return <h1 data-testid="notifications-page" className="text-section font-semibold">{t('nav.notifications')}</h1>;
}
