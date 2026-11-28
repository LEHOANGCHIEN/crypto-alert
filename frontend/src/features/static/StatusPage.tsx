import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { request } from '../../shared/api/http';
import type { Health } from '../../shared/api/types';
import { useFormat } from '../../shared/format/useFormat';
import { Card } from '../../shared/ui/Card';
import { StaticPage } from './StaticPage';

export const STATUS_REFRESH_MS = 30_000;

/** `/status`: live values from `GET /api/v1/health`, refreshed every 30 s (AC-SITE-03). */
export function StatusPage() {
  const { t } = useTranslation();
  const fmt = useFormat();
  const health = useQuery({
    queryKey: ['health'],
    queryFn: () => request<Health>('GET', '/health', undefined, { auth: false }),
    refetchInterval: STATUS_REFRESH_MS,
    staleTime: 0,
  });
  const h = health.data;
  const rows: { id: string; label: string; value: string }[] = h
    ? [
        { id: 'overall', label: t('static.status.overall'), value: t(h.status === 'ok' ? 'static.status.ok' : 'static.status.degraded') },
        { id: 'db', label: t('static.status.db'), value: t(h.db === 'up' ? 'static.status.dbUp' : 'static.status.dbDown') },
        { id: 'provider', label: t('static.status.provider'), value: h.marketData.provider },
        { id: 'connected', label: t('static.status.connected'), value: t(h.marketData.connected ? 'static.status.yes' : 'static.status.no') },
        {
          id: 'last-message',
          label: t('static.status.lastMessage'),
          value: h.marketData.lastMessageAt ? fmt.dateTime(Date.parse(h.marketData.lastMessageAt)) : t('static.status.never'),
        },
        { id: 'version', label: t('static.status.version'), value: h.version },
      ]
    : [];
  return (
    <StaticPage id="status">
      <p>{t('static.status.intro')}</p>
      {health.isError && !h && (
        <p data-testid="sys-unavailable" className="text-text">
          {t('static.status.unavailable')}
        </p>
      )}
      {h && (
        <Card testId="sys-status" className="divide-y divide-border">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-4 px-4 py-3">
              <span>{r.label}</span>
              <span data-testid={`sys-${r.id}`} className="font-mono text-text">
                {r.value}
              </span>
            </div>
          ))}
        </Card>
      )}
      {health.dataUpdatedAt > 0 && (
        <p className="text-meta text-text-faint">
          {t('static.status.updated')}{' '}
          <span data-testid="sys-updated" data-epoch={health.dataUpdatedAt}>
            {fmt.time(health.dataUpdatedAt)}
          </span>
        </p>
      )}
    </StaticPage>
  );
}
