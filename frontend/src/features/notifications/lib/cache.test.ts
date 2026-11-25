import type { Notification, NotificationList } from '../../../shared/api/types';
import { maxId, unreadAfter, withAllRead, withNew, withRead } from './cache';

const n = (id: number, minute: number, readAt: string | null = null): Notification => ({
  id,
  type: 'ALERT_TRIGGERED',
  payload: { alertId: id, symbol: 'BTCUSDT', condition: 'ABOVE', targetPrice: 1, triggeredPrice: 2 },
  readAt,
  createdAt: new Date(Date.UTC(2026, 10, 25, 10, minute)).toISOString(),
});
const list = (items: Notification[], unreadCount: number): NotificationList => ({ items, unreadCount });

describe('notification cache helpers', () => {
  it('withNew puts the new item first, replaces a duplicate id and takes the server unread count', () => {
    const next = withNew(list([n(2, 2), n(1, 1)], 2), n(3, 3), 3)!;
    expect(next.items.map((x) => x.id)).toEqual([3, 2, 1]);
    expect(next.unreadCount).toBe(3);
    expect(withNew(list([n(3, 3), n(1, 1)], 2), n(3, 3), 2)!.items.map((x) => x.id)).toEqual([3, 1]);
    expect(withNew(undefined, n(1, 1), 1)).toBeUndefined();
  });

  it('withRead marks only unread items of the given ids; already-read keep their readAt', () => {
    const at = '2026-11-25T11:00:00.000Z';
    const next = withRead(list([n(3, 3), n(2, 2, '2026-11-25T10:30:00.000Z'), n(1, 1)], 2), [2, 3], 1, at)!;
    expect(next.items.map((x) => x.readAt)).toEqual([at, '2026-11-25T10:30:00.000Z', null]);
    expect(next.unreadCount).toBe(1);
  });

  it('withAllRead marks everything read and zeroes the count', () => {
    const next = withAllRead(list([n(2, 2), n(1, 1)], 2), 'x')!;
    expect(next.items.every((x) => x.readAt !== null)).toBe(true);
    expect(next.unreadCount).toBe(0);
  });

  it('unreadAfter returns unread items newer than the baseline, oldest first', () => {
    const items = [n(5, 5), n(4, 4, 'x'), n(3, 3), n(2, 2)];
    expect(unreadAfter(items, 2).map((x) => x.id)).toEqual([3, 5]);
    expect(unreadAfter(items, 5)).toEqual([]);
    expect(maxId(items)).toBe(5);
    expect(maxId([])).toBe(0);
  });
});
