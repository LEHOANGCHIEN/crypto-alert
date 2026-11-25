import type { Issue } from '../../../shared/validation/rules';

/** Same limits as the backend (API.md §3.5): > 0, ≤ 1e15, at most 8 decimals. */
export const MAX_TARGET = 1e15;
export const MAX_DECIMALS = 8;

/** Parses the target-price input ("67234.5" or "67234,5"). Returns the number or the first field issue. */
export function parseTarget(raw: string): { value: number; issue?: undefined } | { value?: undefined; issue: Issue } {
  const v = raw.trim().replace(',', '.');
  if (!v) return { issue: { code: 'REQUIRED' } };
  if (!/^-?(\d+\.?\d*|\.\d+)$/.test(v)) return { issue: { code: 'INVALID_TYPE' } };
  const value = Number(v);
  if (!(value > 0) || value > MAX_TARGET) return { issue: { code: 'OUT_OF_RANGE' } };
  if ((v.split('.')[1] ?? '').length > MAX_DECIMALS) return { issue: { code: 'TOO_MANY_DECIMALS' } };
  return { value };
}

/** A price as plain input text (no exponent, no grouping): 67234.5 → "67234.5", 1e-7 → "0.0000001". */
export function toInputText(price: number): string {
  return price.toFixed(MAX_DECIMALS).replace(/\.?0+$/, '');
}
