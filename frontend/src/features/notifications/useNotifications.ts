import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { request } from '../../shared/api/http';
import type { AlertTriggeredPayload, Notification, NotificationList } from '../../shared/api/types';
import { useAuth } from '../../shared/auth/auth.store';
import { useFormat } from '../../shared/format/useFormat';
import { errorText } from '../../shared/i18n/errorText';
import { useSymbols } from '../../shared/market/queries';
import { toast } from '../../shared/ui/toast';
import { withAllRead, withRead } from './lib/cache';

export const NOTIFICATIONS_KEY = ['notifications'] as const;
export const fetchNotifications = () => request<NotificationList>('GET', '/notifications');

export const useNotifications = () => {
  const authed = useAuth((s) => s.status === 'authenticated');
  return useQuery({ queryKey: NOTIFICATIONS_KEY, queryFn: fetchNotifications, enabled: authed });
};

export function useMarkRead() {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (id: number) => request<Notification>('POST', `/notifications/${id}/read`),
    onSuccess: (n) =>
      qc.setQueryData<NotificationList>(NOTIFICATIONS_KEY, (old) => {
        const wasUnread = old?.items.some((x) => x.id === n.id && x.readAt === null) ?? false;
        return withRead(old, [n.id], Math.max(0, (old?.unreadCount ?? 0) - (wasUnread ? 1 : 0)), n.readAt ?? undefined);
      }),
    onError: (err) => toast.error(errorText(t, err)),
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: () => request<{ updated: number }>('POST', '/notifications/read-all'),
    onSuccess: () => qc.setQueryData<NotificationList>(NOTIFICATIONS_KEY, (old) => withAllRead(old)),
    onError: (err) => toast.error(errorText(t, err)),
  });
}

const DEFAULT_PRECISION = 2;

/** Formats prices of a notification with the pair precision in the current locale. */
export function useNotificationFormat() {
  const { t } = useTranslation();
  const fmt = useFormat();
  const symbols = useSymbols();
  const precision = useMemo(() => new Map((symbols.data ?? []).map((s) => [s.symbol, s.pricePrecision])), [symbols.data]);
  const price = useCallback((symbol: string, v: number) => fmt.price(v, precision.get(symbol) ?? DEFAULT_PRECISION), [fmt, precision]);
  /** "BTCUSDT rose above 70,000.00 (now 70,012.50)" (API.md §5: notifications.ALERT_TRIGGERED.ABOVE/BELOW). */
  const text = useCallback(
    (p: AlertTriggeredPayload) =>
      t(`notifications.ALERT_TRIGGERED.${p.condition}`, {
        symbol: p.symbol,
        targetPrice: price(p.symbol, p.targetPrice),
        triggeredPrice: price(p.symbol, p.triggeredPrice),
      }),
    [t, price],
  );
  return { price, text, dateTime: fmt.dateTime };
}
