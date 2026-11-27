/** Active alerts per user (SPEC §4); shown as "n/20" next to the alert form. */
export const MAX_ACTIVE_ALERTS = 20;

/** Distance from the current price to the target, in % of the current price (`null` without a usable price). */
export function distancePercent(targetPrice: number, currentPrice: number | undefined): number | null {
  if (currentPrice === undefined || !Number.isFinite(currentPrice) || currentPrice <= 0) return null;
  return ((targetPrice - currentPrice) / currentPrice) * 100;
}
