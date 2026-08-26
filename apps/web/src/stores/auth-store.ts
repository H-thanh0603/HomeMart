'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
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
  setSession: (
    accessToken: string,
    refreshToken: string,
    user?: AuthState['user'],
  ) => void;
  setUser: (user: AuthState['user']) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      hydrated: false,
      setHydrated: () => set({ hydrated: true }),
      setSession: (accessToken, refreshToken, user) =>
        set((s) => ({ accessToken, refreshToken, user: user ?? s.user })),
      setUser: (user) => set({ user }),
      clearSession: () =>
        set({ accessToken: null, refreshToken: null, user: null }),
    }),
    {
      name: 'homemart-auth',
      partialize: (s) => ({
        accessToken: s.accessToken,
        refreshToken: s.refreshToken,
        user: s.user,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    },
  ),
);
