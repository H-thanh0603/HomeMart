'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getData, postData } from '@/lib/api';
import type { AuthPayload, User } from '@/lib/types';
import { useAuthStore } from '@/stores/auth-store';

export function useMe() {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery({
    queryKey: ['me'],
    queryFn: () => getData<User>({ url: '/auth/me' }),
    enabled: Boolean(accessToken),
    staleTime: 5 * 60 * 1000,
  });
}

export function useLogin() {
  const setSession = useAuthStore((s) => s.setSession);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { email: string; password: string }) =>
      postData<AuthPayload>('/auth/login', body),
    onSuccess: (payload) => {
      setSession(payload.accessToken, payload.refreshToken, payload.user);
      queryClient.invalidateQueries();
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { email: string; password: string; fullName: string }) =>
      postData<{ id?: string }>('/auth/register', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (body: { email: string }) => postData<void>('/auth/forgot-password', body),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (body: { token: string; newPassword: string }) =>
      postData<void>('/auth/reset-password', body),
  });
}

export function useLogout() {
  const { refreshToken, clearSession } = useAuthStore.getState();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (refreshToken) {
        try {
          await postData('/auth/logout', { refreshToken });
        } catch {
          // ignore — xoá session local bất kể
        }
      }
    },
    onSuccess: () => {
      clearSession();
      queryClient.clear();
    },
  });
}
