import { useEffect } from 'react';
import { useAuth } from '../features/auth/auth.store';
import { setLocale } from '../shared/i18n';
import { useTheme } from '../shared/theme/ThemeProvider';

/** After login / session restore the account's language and theme win over the guest choice. */
export function PreferencesSync() {
  const user = useAuth((s) => s.user);
  const { setTheme } = useTheme();
  const userId = user?.id;
  useEffect(() => {
    const s = useAuth.getState().user?.settings;
    if (!s) return;
    setLocale(s.locale);
    setTheme(s.theme);
    // Only when the logged-in identity changes — later edits are applied by the actions themselves.
  }, [userId, setTheme]);
  return null;
}
