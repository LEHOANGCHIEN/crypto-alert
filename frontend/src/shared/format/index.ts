/** The ONLY place that formats numbers and dates (CLAUDE.md rule 5). Locale + timezone aware via Intl. */
export type FormatLocale = 'vi' | 'en';

const INTL_LOCALE: Record<FormatLocale, string> = { vi: 'vi-VN', en: 'en-US' };

export function formatPrice(value: number, precision: number, locale: FormatLocale): string {
  return new Intl.NumberFormat(INTL_LOCALE[locale], {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  }).format(value);
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
