/**
 * Admin domain types — mirror của response shapes từ admin API
 * (apps/api/src/modules/admin/*). Chỉ khai báo field nào UI dùng.
 */
import type { Order, OrderStatusHistoryEntry, OrderItem } from './types';

export interface AdminPayment {
  id: string;
  method: import('./types').PaymentMethodType | string;
  status: string;
  amountVnd: number;
  providerRef?: string | null;
  createdAt?: string;
}

export interface AdminShipment {
  id: string;
  trackingCode?: string | null;
  carrier?: string | null;
  status?: string | null;
  shippedAt?: string | null;
  deliveredAt?: string | null;
  method?: { name: string } | null;
}

export interface AdminOrderListItem {
  id: string;
  orderNumber: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  totalAmount: number;
  contactName: string;
  contactPhone: string;
  user: { email: string; fullName: string } | null;
  payments?: { id: string; method: string; status: string; amountVnd: number }[];
}

export interface AdminOrderDetail extends Omit<Order, 'payments' | 'statusHistory' | 'items'> {
  user: { id: string; email: string; fullName: string; phone: string | null } | null;
  statusHistory: OrderStatusHistoryEntry[];
  items: OrderItem[];
  payments: AdminPayment[];
  shipment: AdminShipment | null;
}

export interface DashboardStats {
  todayRevenue: number;
  monthRevenue: number;
  totalOrders: number;
  pendingOrders: number;
  totalCustomers: number;
  totalProducts: number;
  lowStockCount: number;
  statusBreakdown: { status: string; count: number }[];
  recentOrders: { id: string; orderNumber: string; contactName: string; totalAmount: number; status: string; createdAt: string }[];
  topProducts: { id: string; name: string; slug: string; soldCount: number; price: number }[];
  activeVouchers: unknown[];
  lowStock: LowStockRow[];
}

export interface LowStockRow {
  id: string;
  productId: string;
  variantId: string | null;
  availableStock: number;
  reservedStock: number;
  soldStock: number;
  product?: { id: string; name: string; sku: string } | null;
}

export interface AdminPaginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

/** Transition hợp lệ — hiển thị nút theo state hiện tại (client-side mirror của ORDER_TRANSITIONS). */
export const NEXT_STATUS_OPTIONS: Record<string, string[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['PACKING', 'CANCELLED'],
  PACKING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED', 'RETURN_REQUESTED'],
  DELIVERED: ['COMPLETED', 'RETURN_REQUESTED'],
  RETURN_REQUESTED: ['RETURNED', 'CANCELLED'],
  RETURNED: ['REFUNDED'],
  REFUNDED: [],
  COMPLETED: [],
  CANCELLED: [],
};

/** Action cần quyền MANAGER+ (server enforce, UI chỉ disable). */
export const MANAGER_ONLY_ACTIONS = ['RETURNED', 'REFUNDED'];
