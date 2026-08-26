'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Toaster } from '@/components/ui/toast';
import { useCartStore } from '@/stores/cart-store';
import { getData } from '@/lib/api';
import type { Cart } from '@/lib/types';
import { useAuthStore } from '@/stores/auth-store';

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
  const setCount = useCartStore((s) => s.setCount);

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
