/** The ONLY place that formats numbers and dates (CLAUDE.md rule 5). Locale + timezone aware via Intl. */
export type FormatLocale = 'vi' | 'en';

const INTL_LOCALE: Record<FormatLocale, string> = { vi: 'vi-VN', en: 'en-US' };

export function formatPrice(value: number, precision: number, locale: FormatLocale): string {
  return new Intl.NumberFormat(INTL_LOCALE[locale], {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  }).format(value);
}

/** 1543.02 → "+1.543,02" (vi) / "+1,543.02" (en) with the pair's decimals; sign always shown for non-zero. */
export function formatSignedPrice(value: number, precision: number, locale: FormatLocale): string {
  const abs = formatPrice(Math.abs(value), precision, locale);
  const rounded = Number(Math.abs(value).toFixed(precision));
  const sign = rounded === 0 ? '' : value > 0 ? '+' : '−';
  return `${sign}${abs}`;
}

/** 1.2345 → "+1,23%" (vi) / "+1.23%" (en); sign always shown for non-zero. */
export function formatPercent(value: number, locale: FormatLocale): string {
  const abs = new Intl.NumberFormat(INTL_LOCALE[locale], { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(value));
  const rounded = Number(Math.abs(value).toFixed(2));
  const sign = rounded === 0 ? '' : value > 0 ? '+' : '−';
  return `${sign}${abs}%`;
}

export function formatCompact(value: number, locale: FormatLocale): string {
  return new Intl.NumberFormat(INTL_LOCALE[locale], { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

/** epoch ms → "21/11/2026 14:05" (vi) / "11/21/2026, 2:05 PM" (en) in the given IANA timezone. */
export function formatDateTime(epochMs: number, locale: FormatLocale, timeZone: string): string {
  if (locale === 'en') {
    return new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(epochMs);
  }
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(epochMs)
      .map((p) => [p.type, p.value]),
  );
  return `${parts.day}/${parts.month}/${parts.year} ${parts.hour}:${parts.minute}`;
}

/** epoch ms → "14:05:09" (24 h, both languages) in the given IANA timezone. */
export function formatTime(epochMs: number, timeZone: string): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).format(epochMs);
}

/** epoch ms → "20261126-1405" (yyyyMMdd-HHmm) in the given IANA timezone, for file names. */
export function formatFileStamp(epochMs: number, timeZone: string): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(epochMs)
      .map((p) => [p.type, p.value]),
  );
  return `${parts.year}${parts.month}${parts.day}-${parts.hour}${parts.minute}`;
}

export type PriceDirection = 'up' | 'down' | 'flat';

/** Direction of a 24h change as displayed: a change that rounds to 0.00 % is flat (neutral color, no sign). */
export function priceDirection(percent: number): PriceDirection {
  const rounded = Number(Math.abs(percent).toFixed(2));
  if (rounded === 0) return 'flat';
  return percent > 0 ? 'up' : 'down';
}

/** Lightweight Charts tick mark kinds (TickMarkType enum values), kept numeric so this module stays chart-free. */
export const TICK_YEAR = 0;
export const TICK_MONTH = 1;
export const TICK_DAY = 2;

/** Time-axis label of a tick mark, in the given locale and timezone (epoch ms in, text out). */
export function formatTickMark(epochMs: number, tickType: number, locale: FormatLocale, timeZone: string): string {
  const intl = INTL_LOCALE[locale];
  if (tickType === TICK_YEAR) return new Intl.DateTimeFormat(intl, { timeZone, year: 'numeric' }).format(epochMs);
  if (tickType === TICK_MONTH) return new Intl.DateTimeFormat(intl, { timeZone, month: 'short' }).format(epochMs);
  if (tickType === TICK_DAY) return new Intl.DateTimeFormat(intl, { timeZone, day: 'numeric' }).format(epochMs);
  return new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(epochMs);
}

/** epoch ms → "GMT+7" (offset of the given IANA timezone at that moment). */
export function formatGmtOffset(epochMs: number, timeZone: string): string {
  const part = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'shortOffset' }).formatToParts(epochMs).find((p) => p.type === 'timeZoneName');
  const value = part?.value ?? timeZone;
  return value === 'GMT' ? 'GMT+0' : value; // engines differ for UTC ("GMT" vs "GMT+0")
}

/** Whole calendar days from 1 January to today in the given IANA timezone (1 Jan itself = 0). */
export function daysSinceYearStart(epochMs: number, timeZone: string): number {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' })
      .formatToParts(epochMs)
      .map((x) => [x.type, x.value]),
  );
  const today = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day));
  const jan1 = Date.UTC(Number(p.year), 0, 1);
  return Math.round((today - jan1) / 86_400_000);
}
