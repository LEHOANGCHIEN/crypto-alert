import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useMarkAllRead, useMarkRead, useNotificationFormat, useNotifications } from './useNotifications';

type Filter = 'all' | 'unread';
const FILTERS: Filter[] = ['all', 'unread'];

/** Body of the `/notifications` page (AC-NOTIF-06): newest first, All / Unread, click marks read, mark all. */
export function NotificationsList() {
  const { t } = useTranslation();
  const list = useNotifications();
  const markRead = useMarkRead();
  const markAll = useMarkAllRead();
  const { text, price, dateTime } = useNotificationFormat();
  const [filter, setFilter] = useState<Filter>('all');
  const all = list.data?.items ?? [];
  const unreadCount = list.data?.unreadCount ?? 0;
  const items = filter === 'unread' ? all.filter((n) => n.readAt === null) : all;

  return (
    <div data-testid="notifications-page" className="mx-auto flex w-full max-w-4xl flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-price font-semibold">{t('notificationsPage.title')}</h1>
          <p data-testid="notifications-summary" className="text-body text-text-muted">
            {t('notificationsPage.summary', { count: unreadCount, max: 100 })}
          </p>
        </div>
        <button
          type="button"
          data-testid="notifications-mark-all"
          disabled={unreadCount === 0 || markAll.isPending}
          onClick={() => markAll.mutate()}
          className="h-9 rounded-button border border-border bg-surface-2 px-3 text-body font-medium text-text disabled:opacity-60"
        >
          {t('notifications.markAll')}
        </button>
      </div>

      <div role="tablist" aria-label={t('notificationsPage.filterLabel')} className="flex w-fit gap-1 rounded-card border border-border bg-surface p-1">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            role="tab"
            data-testid={`notifications-filter-${f}`}
            aria-selected={filter === f}
            onClick={() => setFilter(f)}
            className={`h-8 rounded-input px-3 text-section ${filter === f ? 'bg-surface-3 font-medium text-text' : 'text-text-muted hover:text-text'}`}
          >
            {t(`notificationsPage.filters.${f}`, { count: f === 'all' ? all.length : unreadCount })}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <p data-testid="notifications-page-empty" className="rounded-card border border-border bg-surface p-6 text-body text-text-muted">
          {list.isPending ? t('notifications.loading') : t(filter === 'unread' ? 'notificationsPage.emptyUnread' : 'notifications.empty')}
        </p>
      ) : (
        <ul data-testid="notifications-page-list" className="overflow-hidden rounded-card border border-border bg-surface">
          {items.map((n) => {
            const unread = n.readAt === null;
            const p = n.payload;
            return (
              <li
                key={n.id}
                data-testid={`notification-item-${n.id}`}
                data-unread={unread}
                data-created={n.createdAt}
                className={`flex gap-3 border-b border-border px-4 py-3 last:border-b-0 ${unread ? 'bg-accent/7' : ''}`}
              >
                <span aria-hidden="true" className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${unread ? 'bg-accent' : 'bg-transparent'}`} />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <button
                    type="button"
                    data-testid="notification-mark-read"
                    onClick={() => {
                      if (unread) markRead.mutate(n.id);
                    }}
                    className="text-left"
                  >
                    {unread && <span className="sr-only">{t('notifications.unread')}</span>}
                    <span data-testid="notification-text" className={`text-section ${unread ? 'font-semibold text-text' : 'text-text-muted'}`}>
                      {text(p)}
                    </span>
                  </button>
                  <span data-testid="notification-detail" className="font-mono text-body tabular-nums text-text-muted">
                    {t('notificationsPage.detail', {
                      condition: t(`alerts.condition.${p.condition}`),
                      target: price(p.symbol, p.targetPrice),
                      triggered: price(p.symbol, p.triggeredPrice),
                    })}
                  </span>
                  <Link to={`/trade/${p.symbol}`} data-testid="notification-chart-link" className="w-fit text-body font-medium text-accent">
                    {t('notificationsPage.viewChart')}
                  </Link>
                </div>
                <span data-testid="notification-time" className="shrink-0 font-mono text-row tabular-nums text-text-muted">
                  {dateTime(Date.parse(n.createdAt))}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
