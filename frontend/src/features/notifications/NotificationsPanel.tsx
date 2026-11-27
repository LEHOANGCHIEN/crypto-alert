import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import type { Notification } from '../../shared/api/types';
import { useMarkAllRead, useMarkRead, useNotificationFormat, useNotifications } from './useNotifications';

const INTERVALS = ['1m', '5m', '15m', '1h', '4h', '1d'];

/** Dropdown list, newest first (AC-NOTIF-02); click = mark read + open the chart (AC-NOTIF-03). */
export function NotificationsPanel({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const list = useNotifications();
  const markRead = useMarkRead();
  const markAll = useMarkAllRead();
  const { price, text, dateTime } = useNotificationFormat();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const tf = INTERVALS.includes(params.get('tf') ?? '') ? params.get('tf') : '1h';
  const items = list.data?.items ?? [];

  const open = (n: Notification) => {
    if (n.readAt === null) markRead.mutate(n.id);
    navigate(`/trade/${n.payload.symbol}?tf=${tf}`);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-label={t('notifications.title')}
      data-testid="notifications-panel"
      className="absolute right-0 top-10 z-40 flex max-h-96 w-80 flex-col rounded-card border border-border bg-surface"
    >
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <h2 className="text-section font-semibold">{t('notifications.title')}</h2>
        <button
          type="button"
          data-testid="notifications-mark-all"
          disabled={(list.data?.unreadCount ?? 0) === 0 || markAll.isPending}
          onClick={() => markAll.mutate()}
          className="text-meta font-medium text-accent disabled:text-text-muted"
        >
          {t('notifications.markAll')}
        </button>
      </div>
      {items.length === 0 ? (
        <p data-testid="notifications-empty" className="p-4 text-center text-text-muted">
          {list.isPending ? t('notifications.loading') : t('notifications.empty')}
        </p>
      ) : (
        <ul className="min-h-0 overflow-y-auto">
          {items.map((n) => {
            const unread = n.readAt === null;
            const p = n.payload;
            return (
              <li key={n.id}>
                <button
                  type="button"
                  data-testid={`notification-item-${n.id}`}
                  data-unread={unread}
                  onClick={() => open(n)}
                  className={`flex w-full gap-2 border-b border-border px-3 py-2 text-left hover:bg-surface-2 ${unread ? 'bg-surface-2' : ''}`}
                >
                  <span aria-hidden="true" className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${unread ? 'bg-accent' : 'bg-transparent'}`} />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    {unread && <span className="sr-only">{t('notifications.unread')}</span>}
                    <span data-testid="notification-text" className={`text-body ${unread ? 'font-semibold text-text' : 'text-text-muted'}`}>
                      {text(p)}
                    </span>
                    <span className="flex flex-wrap gap-x-2 text-meta text-text-muted">
                      <span data-testid="notification-symbol">{p.symbol}</span>
                      <span data-testid="notification-condition">{t(`alerts.condition.${p.condition}`)}</span>
                      <span>
                        {t('notifications.target')} <span data-testid="notification-target" className="tabular-nums">{price(p.symbol, p.targetPrice)}</span>
                      </span>
                      <span>
                        {t('notifications.triggeredPrice')}{' '}
                        <span data-testid="notification-triggered-price" className="tabular-nums">
                          {price(p.symbol, p.triggeredPrice)}
                        </span>
                      </span>
                    </span>
                    <span data-testid="notification-time" className="text-meta tabular-nums text-text-muted">
                      {dateTime(Date.parse(n.createdAt))}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <Link
        to="/notifications"
        data-testid="notifications-view-all"
        onClick={onClose}
        className="border-t border-border px-3 py-2 text-center text-body font-medium text-accent hover:bg-surface-2"
      >
        {t('notifications.viewAll')}
      </Link>
    </div>
  );
}
