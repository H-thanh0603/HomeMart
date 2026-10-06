import { ORDER_STATUS_LABELS } from './utils';

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
