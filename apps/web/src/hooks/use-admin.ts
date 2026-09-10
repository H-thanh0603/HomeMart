'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getData, getPage, patchData, postData } from '@/lib/api';
import type {
  AdminOrderDetail,
  AdminOrderListItem,
  DashboardStats,
  LowStockRow,
} from '@/lib/admin-types';

export const ADMIN_ROLES = ['ADMIN', 'MANAGER', 'STAFF'];

/** Tất cả đơn hàng — filter theo status + search q, phân trang. */
export function useAdminOrders(params: { page?: number; status?: string; q?: string }) {
  return useQuery({
    queryKey: ['admin', 'orders', params],
    queryFn: () =>
      getPage<AdminOrderListItem>({
        url: '/admin/orders',
        params: { limit: 20, ...params },
      }),
    placeholderData: (prev) => prev,
  });
}

export function useAdminOrder(id: string) {
  return useQuery({
    queryKey: ['admin', 'order', id],
    queryFn: () => getData<AdminOrderDetail>({ url: `/admin/orders/${id}` }),
    enabled: Boolean(id),
  });
}

export function useAdminDashboardStats() {
  return useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: () => getData<DashboardStats>({ url: '/admin/dashboard/stats' }),
    staleTime: 60 * 1000,
  });
}

export function useLowStock() {
  return useQuery({
    queryKey: ['admin', 'low-stock'],
    queryFn: () => getData<LowStockRow[]>({ url: '/admin/inventory/low-stock' }),
  });
}

/** Chuyển trạng thái đơn — BR-5 state machine enforce ở server. */
export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, note }: { id: string; status: string; note?: string }) =>
      patchData<AdminOrderDetail>(`/admin/orders/${id}/status`, { status, note }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'order', variables.id] });
    },
  });
}

/** COD đã thu tiền khi giao. */
export function useConfirmCod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) =>
      postData<AdminOrderDetail>(`/admin/orders/${id}/confirm-cod`, { note }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'order', variables.id] });
    },
  });
}

/** Hoàn tiền qua gateway (MANAGER+). */
export function useRefundGateway() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) =>
      postData<AdminOrderDetail>(`/admin/orders/${id}/refund-gateway`),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'order', variables.id] });
    },
  });
}

/** Ops: hết hạn đơn PENDING (cron gọi 5 phút/lần — nút cho trường hợp cần chạy tay). */
export function useExpirePending() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => postData<{ cancelled: number }>('/admin/orders/ops/expire-pending'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    },
  });
}

/** Ops: đối soát payment vs order (hằng ngày). */
export function useReconcile() {
  return useMutation({
    mutationFn: () => postData<Record<string, unknown>>('/admin/orders/ops/reconcile'),
  });
}
