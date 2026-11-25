import type { AlertCondition } from '../alerts/alert-match';

/** API.md §2 `AlertTriggeredPayload` (stored as JSON in `notifications.payload`, never sentences). */
export type AlertTriggeredPayload = {
  alertId: number;
  symbol: string;
  condition: AlertCondition;
  targetPrice: number;
  triggeredPrice: number;
};

/** API.md §2 `Notification` before global serialisation (Date → ISO string). */
export type NotificationRecord = {
  id: number;
  type: 'ALERT_TRIGGERED';
  payload: AlertTriggeredPayload;
  readAt: Date | null;
  createdAt: Date;
};

export const notificationSelect = { id: true, type: true, payload: true, readAt: true, createdAt: true } as const;
