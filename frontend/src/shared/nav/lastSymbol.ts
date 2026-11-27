import { create } from 'zustand';

/** "Last symbol" = last pair opened on /trade or /coin (AC-UI-09); stored in localStorage. */
export const LAST_SYMBOL_KEY = 'crypto-alert.last-symbol';
export const DEFAULT_SYMBOL = 'BTCUSDT';

const FORMAT = /^[A-Z0-9]{2,20}$/;

/** Defensive read: anything that is not a well-formed upper-case symbol falls back to the default. */
export function parseLastSymbol(raw: string | null): string {
  return raw && FORMAT.test(raw) ? raw : DEFAULT_SYMBOL;
}

function load(): string {
  try {
    return parseLastSymbol(localStorage.getItem(LAST_SYMBOL_KEY));
  } catch {
    return DEFAULT_SYMBOL;
  }
}

export const useLastSymbol = create<{ symbol: string; set: (symbol: string) => void }>((set) => ({
  symbol: load(),
  set: (symbol) => {
    if (!FORMAT.test(symbol)) return;
    set({ symbol });
    try {
      localStorage.setItem(LAST_SYMBOL_KEY, symbol);
    } catch {
      /* storage unavailable: just not remembered */
    }
  },
}));
