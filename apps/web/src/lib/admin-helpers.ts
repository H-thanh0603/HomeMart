import { ApiError } from './api';
import { ORDER_STATUS_LABELS } from './utils';

/**
 * Học Twenty getToastOptionsFromError: map error code backend → message
 * thân thiện cho admin. Code lạ → message gốc. Dùng cho mọi toast.error
 * trong admin thay vì hiện message thô.
 */
const ADMIN_ERROR_MESSAGES: Record<string, string> = {
  OUT_OF_STOCK: 'Sản phẩm đã hết hàng — kiểm tra tồn kho trước khi thao tác.',
  PRICE_CHANGED: 'Giá sản phẩm vừa thay đổi — tải lại rồi thử lại.',
  VOUCHER_INVALID: 'Voucher không hợp lệ hoặc đã hết lượt.',
  VOUCHER_LIMIT_REACHED: 'Voucher đã hết lượt sử dụng.',
  INVALID_TRANSITION: 'Trạng thái đơn không cho phép chuyển như vậy.',
  CHECKOUT_FAILED: 'Thanh toán thất bại — thử lại.',
  ALREADY_REVIEWED: 'Mục này đã được đánh giá rồi.',
  ORDER_NOT_ELIGIBLE: 'Chỉ đánh giá được sau khi đơn đã giao.',
  INVALID_RATING: 'Điểm đánh giá phải từ 1–5.',
  CONFLICT: 'Dữ liệu bị trùng — kiểm tra lại (SKU/slug/mã đã tồn tại?).',
  NOT_FOUND: 'Không tìm thấy dữ liệu — có thể đã bị xóa.',
};

const HTTP_FALLBACK: Record<number, string> = {
  400: 'Dữ liệu gửi lên chưa đúng — kiểm tra lại các trường.',
  401: 'Phiên đăng nhập hết hạn — đăng nhập lại.',
  403: 'Bạn không có quyền làm việc này.',
  404: 'Không tìm thấy dữ liệu — có thể đã bị xóa.',
  409: 'Dữ liệu bị trùng — kiểm tra lại (SKU/slug/mã đã tồn tại?).',
  422: 'Thao tác vi phạm quy tắc nghiệp vụ — xem chi tiết.',
};

export function friendlyAdminError(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.code && ADMIN_ERROR_MESSAGES[e.code]) return ADMIN_ERROR_MESSAGES[e.code];
    if (e.status && HTTP_FALLBACK[e.status]) return HTTP_FALLBACK[e.status];
    if (e.message) return e.message;
  }
  if (e instanceof Error && e.message) return e.message;
  return 'Có lỗi xảy ra, vui lòng thử lại';
}

export const PRODUCT_SORTS = ['best_selling', 'price_asc', 'price_desc', 'rating'] as const;

/** Sort lạ từ URL → '' (backend IsIn sẽ 400 nếu gửi thẳng). */
export function normalizeProductSort(raw: string | null | undefined): string {
  return raw && (PRODUCT_SORTS as readonly string[]).includes(raw) ? raw : '';
}

export interface CommandItem {
  href: string;
  label: string;
  hint?: string;
}

/** Lọc palette theo label/href/hint, tối đa 10. */
export function filterCommands(items: CommandItem[], q: string): CommandItem[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return items.slice(0, 10);
  return items
    .filter(
      (i) =>
        i.label.toLowerCase().includes(needle) ||
        i.href.toLowerCase().includes(needle) ||
        (i.hint ?? '').toLowerCase().includes(needle),
    )
    .slice(0, 10);
}

export interface AttentionInput {
  pendingOrders?: number;
  lowStockCount?: number;
  statusBreakdown?: { status: string; count: number }[];
}

export interface Attention {
  key: string;
  label: string;
  href: string;
}

/** Spec §4 Level 3: dashboard trả lời "có gì cần xử lý ngay?". */
export function buildAttentions(stats?: AttentionInput | null): Attention[] {
  if (!stats) return [];
  const out: Attention[] = [];
  if ((stats.pendingOrders ?? 0) > 0) {
    out.push({
      key: 'pending',
      label: `${stats.pendingOrders} đơn PENDING chờ xử lý`,
      href: '/admin/orders?status=PENDING',
    });
  }
  if ((stats.lowStockCount ?? 0) > 0) {
    out.push({
      key: 'low',
      label: `${stats.lowStockCount} sản phẩm sắp hết hàng`,
      href: '/admin/inventory',
    });
  }
  for (const s of stats.statusBreakdown ?? []) {
    if (['RETURN_REQUESTED', 'FAILED'].includes(s.status) && s.count > 0) {
      out.push({
        key: s.status,
        label: `${s.count} đơn ${ORDER_STATUS_LABELS[s.status] ?? s.status} cần xem`,
        href: `/admin/orders?status=${s.status}`,
      });
    }
  }
  return out;
}
