import { create } from 'zustand';
import { refreshSession, request, setAccessToken, setAuthFailureHandler } from '../../shared/api/http';
import type { AuthResult, Locale, Theme, UserMe, UserSettings } from '../../shared/api/types';

type Status = 'loading' | 'authenticated' | 'guest';

type RegisterInput = { email: string; password: string; displayName: string; locale: Locale; theme: Theme };

type AuthState = {
  status: Status;
  user: UserMe | null;
  /** Session restore on app start: refresh cookie → access token → profile (ARCHITECTURE §3.4). */
  restore: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (displayName: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  updateSettings: (patch: Partial<UserSettings>) => Promise<void>;
};

export const useAuth = create<AuthState>((set, get) => ({
  status: 'loading',
  user: null,

  async restore() {
    try {
      const refreshed = await refreshSession();
      if (!refreshed) return set({ status: 'guest', user: null });
      const user = await request<UserMe>('GET', '/users/me');
      set({ status: 'authenticated', user });
    } catch {
      set({ status: 'guest', user: null });
    }
  },

  async login(email, password) {
    const r = await request<AuthResult>('POST', '/auth/login', { email, password }, { auth: false });
    setAccessToken(r.accessToken);
    set({ status: 'authenticated', user: r.user });
  },

  async register(input) {
    const r = await request<AuthResult>('POST', '/auth/register', input, { auth: false });
    setAccessToken(r.accessToken);
    set({ status: 'authenticated', user: r.user });
  },

  async logout() {
    try {
      await request<null>('POST', '/auth/logout', undefined, { auth: false });
    } catch {
      /* the server session may already be gone; local logout still happens */
    }
    setAccessToken(null);
    set({ status: 'guest', user: null });
  },

  async updateProfile(displayName) {
    set({ user: await request<UserMe>('PATCH', '/users/me', { displayName }) });
  },

  async changePassword(currentPassword, newPassword) {
    await request<null>('POST', '/auth/change-password', { currentPassword, newPassword });
  },

  async updateSettings(patch) {
    const settings = await request<UserSettings>('PATCH', '/users/me/settings', patch);
    const user = get().user;
    if (user) set({ user: { ...user, settings } });
  },
}));

// When the session can no longer be refreshed the user is a guest again (RequireAuth redirects to /login).
setAuthFailureHandler(() => {
  setAccessToken(null);
  useAuth.setState({ status: 'guest', user: null });
});
