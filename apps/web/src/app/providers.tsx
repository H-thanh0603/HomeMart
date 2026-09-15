'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Toaster } from '@/components/ui/toast';
import { useCartStore } from '@/stores/cart-store';
import { useAuthStore, persistUser, readPersistedUser } from '@/stores/auth-store';
import { getData } from '@/lib/api';
import type { Cart } from '@/lib/types';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  const accessToken = useAuthStore((s) => s.accessToken);
  const hydrated = useAuthStore((s) => s.hydrated);
  const setHydrated = useAuthStore((s) => s.setHydrated);
  const setUser = useAuthStore((s) => s.setUser);
  const setCount = useCartStore((s) => s.setCount);

  // Boot: restore the non-sensitive profile mirror from localStorage and mark
  // the store hydrated. The access token itself is NEVER persisted (XSS) —
  // the axios interceptor silent-refreshes it via the httpOnly cookie.
  useEffect(() => {
    const user = readPersistedUser();
    if (user) setUser(user);
    setHydrated();
  }, [setUser, setHydrated]);

  // Mirror the profile to localStorage whenever it changes (and clear on logout).
  useEffect(() => {
    if (!hydrated) return;
    persistUser(useAuthStore.getState().user);
  }, [accessToken, hydrated]);

  // Đồng bộ số lượng giỏ hàng (mirror cho header)
  useEffect(() => {
    if (!hydrated || !accessToken) {
      setCount(0);
      return;
    }
    let active = true;
    getData<Cart>({ url: '/cart' })
      .then((cart) => {
        if (active) setCount(cart.items.filter((i) => !i.savedForLater).length);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [accessToken, hydrated, setCount]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster />
    </QueryClientProvider>
  );
}
