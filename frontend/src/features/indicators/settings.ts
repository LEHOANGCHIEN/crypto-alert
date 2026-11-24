/** Indicator settings (SPEC §4.1, A3): stored per browser in localStorage, never in the DB. */
export type MaSetting = { period: number; enabled: boolean };
export type IndicatorSettings = { ma: MaSetting[]; rsi: boolean; macd: boolean };

export const MA_SLOTS = 3;
export const PERIOD_MIN = 2;
export const PERIOD_MAX = 200;
export const INDICATORS_STORAGE_KEY = 'crypto-alert.indicators';

export const DEFAULT_INDICATOR_SETTINGS: IndicatorSettings = {
  ma: [
    { period: 7, enabled: true },
    { period: 25, enabled: true },
    { period: 99, enabled: true },
  ],
  rsi: false,
  macd: false,
};

/** A period typed by the user: an integer 2–200 (digits only), else null. */
export function parsePeriod(text: string): number | null {
  const s = text.trim();
  if (!/^\d{1,3}$/.test(s)) return null;
  const n = Number(s);
  return n >= PERIOD_MIN && n <= PERIOD_MAX ? n : null;
}

const isPeriod = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= PERIOD_MIN && (v as number) <= PERIOD_MAX;

/** Reads stored settings; anything missing or invalid falls back to the defaults (field by field). */
export function parseSettings(raw: string | null): IndicatorSettings {
  let obj: unknown = null;
  try {
    obj = raw ? JSON.parse(raw) : null;
  } catch {
    obj = null;
  }
  const o = (obj && typeof obj === 'object' ? obj : {}) as Partial<Record<keyof IndicatorSettings, unknown>>;
  const ma = Array.isArray(o.ma) ? o.ma : [];
  return {
    ma: DEFAULT_INDICATOR_SETTINGS.ma.map((def, i) => {
      const m = (ma[i] && typeof ma[i] === 'object' ? ma[i] : {}) as Partial<Record<keyof MaSetting, unknown>>;
      return { period: isPeriod(m.period) ? m.period : def.period, enabled: typeof m.enabled === 'boolean' ? m.enabled : def.enabled };
    }),
    rsi: typeof o.rsi === 'boolean' ? o.rsi : DEFAULT_INDICATOR_SETTINGS.rsi,
    macd: typeof o.macd === 'boolean' ? o.macd : DEFAULT_INDICATOR_SETTINGS.macd,
  };
}
