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
  RETURN_REQUESTED: ['RETURNED', 'COMPLETED', 'CANCELLED'],
  RETURNED: ['REFUNDED'],
  REFUNDED: [],
  COMPLETED: [],
  CANCELLED: [],
};

/** Action cần quyền MANAGER+ (server enforce, UI chỉ disable). */
export const MANAGER_ONLY_ACTIONS = ['RETURNED', 'REFUNDED'];

// ─── Catalog / products ──────────────────────────────────────────────
export interface AdminProduct {
  id: string;
  sku: string;
  name: string;
  slug: string;
  price: number;
  compareAtPrice?: number | null;
  status: string;
  categoryId: string;
  brandId?: string | null;
  soldCount?: number;
  createdAt: string;
}

export interface AdminCategory {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  parentId?: string | null;
  sortOrder: number;
  children?: AdminCategory[];
}

export interface AdminBrand {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  description?: string | null;
}

// ─── Vouchers / promotions ───────────────────────────────────────────
export interface AdminVoucher {
  id: string;
  code: string;
  type: string;
  value: number;
  maxDiscountAmount?: number | null;
  minOrderAmount?: number | null;
  usageLimit?: number | null;
  usedCount: number;
  usageLimitPerUser?: number | null;
  status: string;
  startsAt: string;
  endsAt: string;
}

export interface AdminPromotion {
  id: string;
  name: string;
  type: string;
  value: number;
  scope?: string;
  isActive?: boolean;
  startsAt: string;
  endsAt: string;
}

// ─── Shipping ────────────────────────────────────────────────────────
export interface AdminShipmentRow {
  id: string;
  orderId: string;
  methodId: string;
  carrierName?: string | null;
  trackingCode?: string | null;
  status: string;
  createdAt: string;
  order?: { orderNumber: string; contactName: string } | null;
  method?: { name: string } | null;
}

export interface AdminShippingMethod {
  id: string;
  code: string;
  name: string;
  baseFee: number;
  feePerKg: number;
  estimatedDaysMin: number;
  estimatedDaysMax: number;
}

export const SHIPMENT_STATUSES = [
  'PREPARING', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED', 'RETURNED',
];

// ─── Reviews ─────────────────────────────────────────────────────────
export interface AdminReview {
  id: string;
  productId: string;
  rating: number;
  comment?: string | null;
  status: string;
  createdAt: string;
  user?: { fullName: string; email: string } | null;
  product?: { name: string; slug: string } | null;
}

export const REVIEW_STATUSES = ['PENDING', 'APPROVED', 'HIDDEN'];

// ─── Reports ─────────────────────────────────────────────────────────
export interface RevenuePoint {
  period: string;
  revenue: number;
  orders: number;
}

export interface TopCategory {
  name: string;
  revenue: number;
  units: number;
}

export interface SoftLaunch {
  period: { from: string; to: string };
  totals: { totalOrders: number; cancelledOrders: number; deliveredOrders: number; returnRequested: number };
  metrics: { checkoutSuccessRate: number; onTimeRate: number; returnRate: number };
  gates: { checkout: boolean; onTime: boolean; returns: boolean; allPass: boolean };
}

// ─── Audit logs ──────────────────────────────────────────────────────
export interface AuditLogRow {
  id: string;
  actorId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  createdAt: string;
}

// ─── Users ───────────────────────────────────────────────────────────
export interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  phone?: string | null;
  role: string;
  status: string;
  lastLoginAt?: string | null;
  createdAt: string;
}

export const USER_ROLES = ['CUSTOMER', 'STAFF', 'MANAGER', 'ADMIN'];
export const USER_STATUSES = ['ACTIVE', 'INACTIVE', 'BANNED'];
