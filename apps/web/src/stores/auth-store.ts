'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  accessToken: string | null;
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

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      hydrated: false,
      setHydrated: () => set({ hydrated: true }),
      setSession: (accessToken, user) =>
        set((s) => ({ accessToken, user: user ?? s.user })),
      setUser: (user) => set({ user }),
      clearSession: () => set({ accessToken: null, user: null }),
    }),
    {
      name: 'homemart-auth',
      partialize: (s) => ({
        accessToken: s.accessToken,
        user: s.user,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    },
  ),
);
