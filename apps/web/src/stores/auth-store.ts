'use client';

import { create } from 'zustand';

interface AuthState {
  /**
   * Access token lives in MEMORY ONLY — never persisted to localStorage.
   * An XSS in any dependency could otherwise read it and hijack the account
   * until expiry. After a full page reload the token is null; the axios
   * interceptor (lib/api.ts) silent-refreshes via the httpOnly `hm_rt`
   * cookie on the first 401, restoring the session transparently.
   */
  accessToken: string | null;
  /** Non-sensitive profile mirror (name/avatar/role) — safe to persist. */
  user: {
    id: string;
    email: string;
    fullName: string;
    phone?: string | null;
    avatarUrl?: string | null;
    role: string;
  } | null;
  hydrated: boolean;
  setHydrated: () => void;
  // Refresh token lives in an httpOnly cookie set by the API — never in JS storage.
  setSession: (accessToken: string, user?: AuthState['user']) => void;
  setUser: (user: AuthState['user']) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  accessToken: null,
  user: null,
  hydrated: false,
  setHydrated: () => set({ hydrated: true }),
  setSession: (accessToken, user) =>
    set((s) => ({ accessToken, user: user ?? s.user })),
  setUser: (user) => set({ user }),
  clearSession: () => set({ accessToken: null, user: null }),
}));

/**
 * Persist only the non-sensitive user profile. The access token is NOT here —
 * see AuthState.accessToken above. Rehydrated manually on boot (providers.tsx)
 * because zustand `persist` would also need `partialize` on the token field.
 */
const USER_KEY = 'homemart-user';

export function persistUser(user: AuthState['user']) {
  if (typeof window === 'undefined') return;
  try {
    if (user) window.localStorage.setItem(USER_KEY, JSON.stringify(user));
    else window.localStorage.removeItem(USER_KEY);
  } catch {
    // storage disabled/private mode — session still works, just no profile mirror
  }
}

export function readPersistedUser(): AuthState['user'] {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthState['user']) : null;
  } catch {
    return null;
  }
}
