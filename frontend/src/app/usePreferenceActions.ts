import { useCallback } from 'react';
import { useAuth } from '../features/auth/auth.store';
import type { UserSettings } from '../shared/api/types';
import { setLocale } from '../shared/i18n';
import { useTheme } from '../shared/theme/ThemeProvider';

/**
 * Language / theme / timezone changes: always applied locally (guest = browser storage),
 * and saved to the account when logged in (AC-I18N-05, AC-THEME-03).
 */
export function usePreferenceActions() {
  const { setTheme } = useTheme();
  const loggedIn = useAuth((s) => s.status === 'authenticated');
  const updateSettings = useAuth((s) => s.updateSettings);

  const changeLocale = useCallback(
    (locale: UserSettings['locale']) => {
      setLocale(locale);
      if (loggedIn) void updateSettings({ locale }).catch(() => undefined);
    },
    [loggedIn, updateSettings],
  );

  const changeTheme = useCallback(
    (theme: UserSettings['theme']) => {
      setTheme(theme);
      if (loggedIn) void updateSettings({ theme }).catch(() => undefined);
    },
    [loggedIn, setTheme, updateSettings],
  );

  /** Account page "Save": one request for all three values; throws on failure. */
  const savePreferences = useCallback(
    async (next: UserSettings) => {
      await updateSettings(next);
      setLocale(next.locale);
      setTheme(next.theme);
    },
    [setTheme, updateSettings],
  );

  return { changeLocale, changeTheme, savePreferences };
}
