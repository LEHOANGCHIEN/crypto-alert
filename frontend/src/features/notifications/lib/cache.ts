import type { Notification, NotificationList } from '../../../shared/api/types';

/** Pure cache updates for the `['notifications']` query (newest first). `undefined` stays `undefined` (a fetch follows). */
const newestFirst = (a: Notification, b: Notification) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || b.id - a.id;

export function withNew(list: NotificationList | undefined, n: Notification, unreadCount: number): NotificationList | undefined {
  if (!list) return list;
  return { items: [n, ...list.items.filter((x) => x.id !== n.id)].sort(newestFirst), unreadCount };
}

export function withRead(list: NotificationList | undefined, ids: number[], unreadCount: number, readAt = new Date().toISOString()): NotificationList | undefined {
  if (!list) return list;
  const read = new Set(ids);
  return { items: list.items.map((x) => (read.has(x.id) && x.readAt === null ? { ...x, readAt } : x)), unreadCount };
}

export function withAllRead(list: NotificationList | undefined, readAt = new Date().toISOString()): NotificationList | undefined {
  if (!list) return list;
  return { items: list.items.map((x) => (x.readAt === null ? { ...x, readAt } : x)), unreadCount: 0 };
}

export const maxId = (items: Notification[]): number => items.reduce((m, x) => Math.max(m, x.id), 0);

/** Unread notifications newer than `baseline` (an id), oldest first: the ones this tab has not shown yet. */
export const unreadAfter = (items: Notification[], baseline: number): Notification[] =>
  items.filter((x) => x.readAt === null && x.id > baseline).sort((a, b) => a.id - b.id);
