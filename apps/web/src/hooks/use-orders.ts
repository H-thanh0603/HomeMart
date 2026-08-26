'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getData, postData } from '@/lib/api';
import type { CheckoutResult, Order, OrderPreview, ShippingMethod } from '@/lib/types';

export function useOrders() {
  return useQuery({
    queryKey: ['orders'],
    queryFn: () => getData<Order[]>({ url: '/orders' }),
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: ['orders', id],
    queryFn: () => getData<Order>({ url: `/orders/${id}` }),
    enabled: Boolean(id),
  });
}

export function useCancelOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      postData<Order>(`/orders/${id}/cancel`, { reason }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order', variables.id] });
    },
  });
}

export function useShippingMethods() {
  return useQuery({
    queryKey: ['shipping-methods'],
    queryFn: () => getData<ShippingMethod[]>({ url: '/shipping/methods' }),
    staleTime: 5 * 60 * 1000,
  });
}

export function useOrderPreview(body: {
  shippingMethodId?: string;
  voucherCode?: string;
}) {
  return useQuery({
    queryKey: ['order-preview', body],
    queryFn: () => postData<OrderPreview>('/orders/preview', body),
    retry: false,
    gcTime: 0,
  });
}

export function useCheckout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      addressId: string;
      shippingMethodId: string;
      voucherCode?: string;
      paymentMethod: string;
      note?: string;
    }) => postData<CheckoutResult>('/orders/checkout', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}
