/** Last 5 opened pairs, newest first (AC-SITE-02, localStorage `crypto-alert.recent-symbols`). */
export const RECENT_KEY = 'crypto-alert.recent-symbols';
export const RECENT_MAX = 5;
const FORMAT = /^[A-Z0-9]{2,20}$/;

/** Defensive parse: anything that is not a JSON array of well-formed symbols is dropped. */
export function parseRecent(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    const out: string[] = [];
    for (const v of value) if (typeof v === 'string' && FORMAT.test(v) && !out.includes(v)) out.push(v);
    return out.slice(0, RECENT_MAX);
  } catch {
    return [];
  }
}

/** New list with `symbol` first (deduplicated) and at most 5 entries. */
export function addRecent(list: string[], symbol: string): string[] {
  if (!FORMAT.test(symbol)) return list;
  return [symbol, ...list.filter((s) => s !== symbol)].slice(0, RECENT_MAX);
}

export function readRecent(): string[] {
  try {
    return parseRecent(localStorage.getItem(RECENT_KEY));
  } catch {
    return [];
  }
}

export function rememberSymbol(symbol: string): void {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(addRecent(readRecent(), symbol)));
  } catch {
    /* storage unavailable: just not remembered */
  }
}
