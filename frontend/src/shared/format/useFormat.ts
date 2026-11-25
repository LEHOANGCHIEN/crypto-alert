import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/auth.store';
import { formatCompact, formatDateTime, formatPercent, formatPrice, formatTickMark, formatTime, type FormatLocale } from './index';

export const DEFAULT_TIMEZONE = 'Asia/Ho_Chi_Minh';

/** Formatters bound to the current UI language and the user's timezone (guest = Asia/Ho_Chi_Minh). */
export function useFormat() {
  const { i18n } = useTranslation();
  const locale: FormatLocale = i18n.language === 'en' ? 'en' : 'vi';
  const timeZone = useAuth((s) => s.user?.settings.timezone) ?? DEFAULT_TIMEZONE;
  return useMemo(
    () => ({
      locale,
      timeZone,
      price: (v: number, precision: number) => formatPrice(v, precision, locale),
      percent: (v: number) => formatPercent(v, locale),
      compact: (v: number) => formatCompact(v, locale),
      dateTime: (epochMs: number) => formatDateTime(epochMs, locale, timeZone),
      time: (epochMs: number) => formatTime(epochMs, timeZone),
      tickMark: (epochMs: number, tickType: number) => formatTickMark(epochMs, tickType, locale, timeZone),
    }),
    [locale, timeZone],
  );
}
