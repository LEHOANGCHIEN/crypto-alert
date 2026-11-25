export type AlertCondition = 'ABOVE' | 'BELOW';
export type AlertStatus = 'ACTIVE' | 'TRIGGERED';

/** SPEC §4: ABOVE triggers when last price ≥ target, BELOW when last price ≤ target. */
export function isConditionMet(condition: AlertCondition, targetPrice: number, price: number): boolean {
  return condition === 'ABOVE' ? price >= targetPrice : price <= targetPrice;
}
