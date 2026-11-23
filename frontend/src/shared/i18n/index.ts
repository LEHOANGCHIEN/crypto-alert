import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import vi from './locales/vi.json';
import en from './locales/en.json';

export type Locale = 'vi' | 'en';
export const LOCALE_STORAGE_KEY = 'crypto-alert.locale';

function readStoredLocale(): Locale {
  try {
    const v = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (v === 'vi' || v === 'en') return v;
  } catch {
    /* storage unavailable */
  }
  return 'vi'; // default is Vietnamese regardless of browser language (AC-I18N-01)
}

export function setLocale(locale: Locale): void {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    /* ignore */
  }
  void i18n.changeLanguage(locale);
}

i18n.use(initReactI18next).init({
  resources: { vi: { translation: vi }, en: { translation: en } },
  lng: readStoredLocale(),
  fallbackLng: 'vi',
  interpolation: { escapeValue: false },
});

function syncHtmlLang(lng: string): void {
  document.documentElement.lang = lng;
}
syncHtmlLang(i18n.language);
i18n.on('languageChanged', syncHtmlLang);

export default i18n;
