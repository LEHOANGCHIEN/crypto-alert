import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { NotificationList } from '../../shared/api/types';
import { useAuth } from '../../shared/auth/auth.store';
import { useSocketConnect, useSocketEvent } from '../../shared/socket/useSocketEvent';
import { toast } from '../../shared/ui/toast';
import { maxId, unreadAfter, withNew, withRead } from './lib/cache';
import { fetchNotifications, NOTIFICATIONS_KEY, useNotificationFormat, useNotifications } from './useNotifications';

/**
 * Per-tab notification state (API.md §4.3, ARCHITECTURE §3.4):
 * - first list of a session (app start / login) sets the baseline (newest id) and shows the unread summary toast (AC-NOTIF-04);
 * - `notification:new` → toast + bell + alerts refresh; `notification:read` → bell/list sync across tabs (AC-NOTIF-05);
 * - every socket (re)connect → re-sync and toast unread notifications newer than the baseline (missed while offline).
 */
export function NotificationsSession() {
  const qc = useQueryClient();
  const { t } = useTranslation();
  const { text } = useNotificationFormat();
  const userId = useAuth((s) => s.user?.id ?? null);
  const authed = useAuth((s) => s.status === 'authenticated');
  const list = useNotifications();
  const session = useRef<{ userId: number | null; since: number; baseline: number | null }>({ userId: null, since: 0, baseline: null });

  // A different user (or logout): start a fresh session and drop the previous user's data.
  useEffect(() => {
    session.current = { userId, since: Date.now(), baseline: null };
    void qc.resetQueries({ queryKey: NOTIFICATIONS_KEY });
  }, [userId, qc]);

  useEffect(() => {
    const s = session.current;
    if (!authed || !list.data || s.baseline !== null || s.userId !== userId || list.dataUpdatedAt < s.since) return;
    s.baseline = maxId(list.data.items);
    if (list.data.unreadCount > 0) toast.notification(t('notifications.summary', { count: list.data.unreadCount }));
  }, [authed, userId, list.data, list.dataUpdatedAt, t]);

  useSocketEvent('notification:new', ({ notification, unreadCount }) => {
    const s = session.current;
    qc.setQueryData<NotificationList>(NOTIFICATIONS_KEY, (old) => withNew(old, notification, unreadCount));
    void qc.invalidateQueries({ queryKey: ['alerts'] });
    if (s.baseline !== null && notification.id <= s.baseline) return; // already shown by a re-sync
    toast.notification(text(notification.payload));
    if (s.baseline !== null) s.baseline = notification.id;
  });

  useSocketEvent('notification:read', ({ ids, unreadCount }) => {
    qc.setQueryData<NotificationList>(NOTIFICATIONS_KEY, (old) => withRead(old, ids, unreadCount));
  });

  useSocketConnect(() => {
    if (useAuth.getState().status !== 'authenticated') return;
    void qc.invalidateQueries({ queryKey: ['alerts'] });
    const s = session.current;
    if (s.baseline === null) {
      void qc.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
      return;
    }
    qc.fetchQuery({ queryKey: NOTIFICATIONS_KEY, queryFn: fetchNotifications, staleTime: 0 })
      .then((data) => {
        if (session.current !== s || s.baseline === null) return;
        for (const n of unreadAfter(data.items, s.baseline)) toast.notification(text(n.payload));
        s.baseline = Math.max(s.baseline, maxId(data.items));
      })
      .catch(() => undefined);
  });

  return null;
}
