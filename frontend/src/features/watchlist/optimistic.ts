import type { WatchlistItem } from "../../shared/api/types";

/** Pure list helpers for optimistic updates (the server stays the source of truth after `onSettled`). */
export function withItem(
  list: WatchlistItem[],
  symbol: string,
  now: string,
): WatchlistItem[] {
  return list.some((i) => i.symbol === symbol)
    ? list
    : [...list, { symbol, createdAt: now }];
}

export function withoutItem(
  list: WatchlistItem[],
  symbol: string,
): WatchlistItem[] {
  return list.filter((i) => i.symbol !== symbol);
}
