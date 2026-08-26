export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'PACKING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'RETURN_REQUESTED'
  | 'RETURNED'
  | 'REFUNDED';

export type PaymentMethodType = 'COD' | 'VNPAY' | 'MOMO' | 'STRIPE' | 'BANK_TRANSFER';

export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: PageMeta;
  code?: string;
  errors?: { field: string; message: string }[];
}

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone?: string | null;
  avatarUrl?: string | null;
  role: 'CUSTOMER' | 'STAFF' | 'ADMIN';
  emailVerifiedAt?: string | null;
  createdAt: string;
}

export interface AuthPayload {
  accessToken: string;
  user: User;
}

export interface RefreshPayload {
  accessToken: string;
}

export interface Category {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  sortOrder: number;
  children?: Category[];
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
}

export interface ProductImage {
  id: string;
  url: string;
  alt?: string | null;
  isPrimary: boolean;
  sortOrder: number;
}

export interface ProductAttribute {
  id: string;
  name: string;
  value: string;
}

export interface ProductVariant {
  id: string;
  productId: string;
  sku: string;
  attributes: Record<string, string>;
  price: number;
  compareAtPrice?: number | null;
  imageUrl?: string | null;
  status: string;
  inventory?: Inventory | null;
}

export interface Inventory {
  availableStock: number;
  reservedStock: number;
  lowStockThreshold: number;
}

export interface Product {
  id: string;
  sku: string;
  slug: string;
  name: string;
  shortDescription?: string | null;
  description?: string | null;
  categoryId: string;
  brandId?: string | null;
  price: number;
  compareAtPrice?: number | null;
  status: string;
  tags: string[];
  ratingAvg: number | string;
  reviewCount: number;
  soldCount: number;
  seoTitle?: string | null;
  seoDescription?: string | null;
  warrantyMonths?: number | null;
  origin?: string | null;
  category?: Category;
  brand?: Brand | null;
  images?: ProductImage[];
  attributes?: ProductAttribute[];
  variants?: ProductVariant[];
  inventory?: Inventory | null;
  createdAt?: string;
}

export interface ReviewAuthor {
  id: string;
  fullName: string;
  avatarUrl?: string | null;
}

export interface ProductReview {
  id: string;
  rating: number;
  comment?: string | null;
  createdAt: string;
  user?: ReviewAuthor;
}

export interface CartItem {
  id: string;
  productId: string;
  variantId?: string | null;
  quantity: number;
  savedForLater: boolean;
  product: Product;
  variant?: ProductVariant | null;
}

export interface Cart {
  id: string;
  items: CartItem[];
}

export interface Address {
  id: string;
  fullName: string;
  phone: string;
  province: string;
  district: string;
  ward: string;
  line: string;
  isDefault: boolean;
}

export interface ShippingMethod {
  id: string;
  code: string;
  name: string;
  baseFee: number;
  feePerKg: number;
  freeShippingMinSubtotal?: number | null;
  estimatedDaysMin: number;
  estimatedDaysMax: number;
  isActive: boolean;
}

export interface OrderPreview {
  subtotalAmount: number;
  discountAmount: number;
  shippingFee: number;
  taxAmount: number;
  totalAmount: number;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  productImage?: string | null;
  sku: string;
  variantAttributes?: Record<string, string> | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface OrderStatusHistoryEntry {
  id: string;
  fromStatus?: OrderStatus | null;
  toStatus: OrderStatus;
  note?: string | null;
  createdAt: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  contactName: string;
  contactPhone: string;
  shippingProvince: string;
  shippingDistrict: string;
  shippingWard: string;
  shippingLine: string;
  subtotalAmount: number;
  discountAmount: number;
  shippingFee: number;
  taxAmount: number;
  totalAmount: number;
  voucherCode?: string | null;
  note?: string | null;
  cancelledReason?: string | null;
  items: OrderItem[];
  statusHistory?: OrderStatusHistoryEntry[];
  paymentMethod?: PaymentMethodType;
  createdAt: string;
  updatedAt?: string;
}

export interface WishlistItem {
  id: string;
  productId: string;
  variantId?: string | null;
  product: Product;
}

export interface Wishlist {
  id: string;
  items: WishlistItem[];
}

export interface CheckoutResult {
  order?: Order;
  orderId?: string;
  redirectUrl?: string;
}
