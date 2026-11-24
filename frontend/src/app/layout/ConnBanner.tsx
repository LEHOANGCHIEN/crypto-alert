import { useTranslation } from 'react-i18next';
import { useConnection } from '../../shared/socket/connection.store';

/** "Reconnecting…" while the socket to our backend is down (after it was up once). */
export function ConnBanner() {
  const { t } = useTranslation();
  const show = useConnection((s) => s.everConnected && !s.connected);
  if (!show) return null;
  return (
    <div data-testid="conn-banner" role="status" className="shrink-0 bg-warning px-4 py-1 text-center text-meta font-medium text-bg">
      {t('connection.reconnecting')}
    </div>
  );
}
