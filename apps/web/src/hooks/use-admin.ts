'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteData, getData, getPage, patchData, postData, api } from '@/lib/api';
import type { ApiEnvelope } from '@/lib/types';
import type {
  AdminBrand,
  AdminCategory,
  AdminOrderDetail,
  AdminOrderListItem,
  AdminProduct,
  AdminPromotion,
  AdminReview,
  AdminShipmentRow,
  AdminShippingMethod,
  AdminUser,
  AdminVoucher,
  AuditLogRow,
  DashboardStats,
  LowStockRow,
  RevenuePoint,
  SoftLaunch,
  TopCategory,
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

export function useAdjustInventory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, delta }: { id: string; delta: number }) =>
      postData(`/admin/inventory/${id}/adjust`, { delta }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'low-stock'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    },
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

/** Ops: upload CSV merchant portal (VNPay/MoMo) → đối soát với DB. */
export function useReconcileReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ provider, file }: { provider: 'VNPAY' | 'MOMO'; file: File }) => {
      const form = new FormData();
      form.append('provider', provider);
      form.append('file', file);
      // multipart: để axios tự set Content-Type + boundary.
      return api
        .post<ApiEnvelope<Record<string, unknown>>>('/admin/orders/ops/reconcile-report', form)
        .then((res) => res.data.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
    },
  });
}

/** Invalidate helper cho 1 domain. */
function useInvalidateDomain(domain: string) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['admin', domain] });
}

// ─── Products ────────────────────────────────────────────────────────
export function useAdminProducts(params: { page?: number; q?: string; status?: string; sort?: string }) {
  return useQuery({
    queryKey: ['admin', 'products', params],
    queryFn: () => getPage<AdminProduct>({ url: '/admin/products', params: { limit: 20, ...params } }),
    placeholderData: (prev) => prev,
  });
}

export function useAdminProductMutation() {
  const invalidate = useInvalidateDomain('products');
  const create = useMutation({ mutationFn: (body: Record<string, unknown>) => postData('/admin/products', body), onSuccess: invalidate });
  const update = useMutation({ mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) => patchData(`/admin/products/${id}`, body), onSuccess: invalidate });
  const remove = useMutation({ mutationFn: (id: string) => deleteData(`/admin/products/${id}`), onSuccess: invalidate });
  const restore = useMutation({ mutationFn: (id: string) => patchData(`/admin/products/${id}/restore`), onSuccess: invalidate });
  const bulk = useMutation({ mutationFn: (body: { action: string; ids: string[] }) => postData('/admin/products/bulk', body), onSuccess: invalidate });
  return { create, update, remove, restore, bulk };
}

export function useImportProducts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append('file', file);
      return api.post<ApiEnvelope<Record<string, unknown>>>('/admin/products/import', form).then((res) => res.data.data);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'products'] }),
  });
}

// ─── Catalog: categories + brands ────────────────────────────────────
export function useAdminCategories() {
  return useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: () => getData<AdminCategory[]>({ url: '/categories' }),
  });
}

export function useAdminBrands() {
  return useQuery({
    queryKey: ['admin', 'brands'],
    queryFn: () => getData<AdminBrand[]>({ url: '/brands' }),
  });
}

export function useAdminCatalogMutation() {
  const queryClient = useQueryClient();
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] });
    queryClient.invalidateQueries({ queryKey: ['admin', 'brands'] });
  };
  const createCategory = useMutation({ mutationFn: (body: Record<string, unknown>) => postData('/admin/categories', body), onSuccess: invalidate });
  const updateCategory = useMutation({ mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) => patchData(`/admin/categories/${id}`, body), onSuccess: invalidate });
  const deleteCategory = useMutation({ mutationFn: (id: string) => deleteData(`/admin/categories/${id}`), onSuccess: invalidate });
  const createBrand = useMutation({ mutationFn: (body: Record<string, unknown>) => postData('/admin/brands', body), onSuccess: invalidate });
  const updateBrand = useMutation({ mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) => patchData(`/admin/brands/${id}`, body), onSuccess: invalidate });
  const deleteBrand = useMutation({ mutationFn: (id: string) => deleteData(`/admin/brands/${id}`), onSuccess: invalidate });
  return { createCategory, updateCategory, deleteCategory, createBrand, updateBrand, deleteBrand };
}

// ─── Vouchers ────────────────────────────────────────────────────────
export function useAdminVouchers() {
  return useQuery({
    queryKey: ['admin', 'vouchers'],
    queryFn: () => getData<AdminVoucher[]>({ url: '/admin/vouchers' }),
  });
}

export function useAdminPromotions() {
  return useQuery({
    queryKey: ['admin', 'promotions'],
    queryFn: () => getData<AdminPromotion[]>({ url: '/admin/promotions' }),
  });
}

export function useAdminVoucherMutation() {
  const invalidate = useInvalidateDomain('vouchers');
  const create = useMutation({ mutationFn: (body: Record<string, unknown>) => postData('/admin/vouchers', body), onSuccess: invalidate });
  const update = useMutation({ mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) => patchData(`/admin/vouchers/${id}`, body), onSuccess: invalidate });
  const remove = useMutation({ mutationFn: (id: string) => deleteData(`/admin/vouchers/${id}`), onSuccess: invalidate });
  return { create, update, remove };
}

// ─── Shipping ────────────────────────────────────────────────────────
export function useAdminShipments(params: { status?: string }) {
  return useQuery({
    queryKey: ['admin', 'shipments', params],
    queryFn: () => getData<AdminShipmentRow[]>({ url: '/admin/shipments', params }),
  });
}

export function useAdminShippingMutation() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'shipments'] });
  const createMethod = useMutation({ mutationFn: (body: Record<string, unknown>) => postData('/admin/shipping-methods', body) });
  const updateTracking = useMutation({ mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) => patchData(`/admin/shipments/${id}/tracking`, body), onSuccess: invalidate });
  return { createMethod, updateTracking };
}

// ─── Reviews ─────────────────────────────────────────────────────────
export function useAdminReviews(params: { page?: number; status?: string }) {
  return useQuery({
    queryKey: ['admin', 'reviews', params],
    queryFn: () => getPage<AdminReview>({ url: '/admin/reviews', params: { limit: 20, ...params } }),
    placeholderData: (prev) => prev,
  });
}

export function useModerateReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'APPROVED' | 'HIDDEN' }) =>
      patchData(`/admin/reviews/${id}/moderate`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'reviews'] }),
  });
}

// ─── Reports ─────────────────────────────────────────────────────────
export function useRevenueReport(params: { from: string; to: string; groupBy: 'day' | 'month' }) {
  return useQuery({
    queryKey: ['admin', 'reports', 'revenue', params],
    queryFn: () => getData<RevenuePoint[]>({ url: '/admin/reports/revenue', params }),
  });
}

export function useTopCategories(params: { from: string; to: string }) {
  return useQuery({
    queryKey: ['admin', 'reports', 'top-categories', params],
    queryFn: () => getData<TopCategory[]>({ url: '/admin/reports/top-categories', params }),
  });
}

export function useSoftLaunch(params: { from?: string; to?: string }) {
  return useQuery({
    queryKey: ['admin', 'reports', 'soft-launch', params],
    queryFn: () => getData<SoftLaunch>({ url: '/admin/reports/soft-launch', params }),
  });
}

// ─── Audit logs ──────────────────────────────────────────────────────
export function useAuditLogs(params: { page?: number }) {
  return useQuery({
    queryKey: ['admin', 'audit-logs', params],
    queryFn: () => getPage<AuditLogRow>({ url: '/admin/audit-logs', params: { limit: 50, ...params } }),
    placeholderData: (prev) => prev,
  });
}

// ─── Users (ADMIN) ───────────────────────────────────────────────────
export function useAdminUsers(params: { page?: number; q?: string; role?: string; status?: string }) {
  return useQuery({
    queryKey: ['admin', 'users', params],
    queryFn: () => getPage<AdminUser>({ url: '/admin/users', params: { limit: 20, ...params } }),
    placeholderData: (prev) => prev,
  });
}

export function useAdminUserMutation() {
  const invalidate = useInvalidateDomain('users');
  const updateRole = useMutation({ mutationFn: ({ id, role }: { id: string; role: string }) => patchData(`/admin/users/${id}/role`, { role }), onSuccess: invalidate });
  const updateStatus = useMutation({ mutationFn: ({ id, status }: { id: string; status: string }) => patchData(`/admin/users/${id}/status`, { status }), onSuccess: invalidate });
  return { updateRole, updateStatus };
}
