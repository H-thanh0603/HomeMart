'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, BookmarkPlus, CheckCircle2, ShieldCheck, ShoppingBag, Trash2, Truck } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import {
  useCart,
  useRemoveCartItem,
  useSaveForLater,
  useUpdateCartItem,
} from '@/hooks/use-catalog';
import { Price } from '@/components/product/price';
import { QuantityStepper } from '@/components/ui/quantity-stepper';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ListSkeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/empty-state';
import { formatCurrency } from '@/lib/utils';
import type { CartItem } from '@/lib/types';
import { toast } from '@/stores/toast-store';
import { useEffect } from 'react';
import { useCartStore } from '@/stores/cart-store';

function CartRow({ item }: { item: CartItem }) {
  const update = useUpdateCartItem();
  const remove = useRemoveCartItem();
  const save = useSaveForLater();
  const product = item.product;
  const variant = item.variant;
  const unitPrice = variant?.price ?? product.price;
  const stock = product.inventory?.availableStock ?? variant?.inventory?.availableStock;

  const image = product.images?.find((i) => i.isPrimary) ?? product.images?.[0];

  return (
    <div className="flex gap-4 py-4 first:pt-0 last:pb-0">
      <Link
        href={`/products/${product.slug}`}
        className="shrink-0 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
      >
        <div className="relative h-24 w-24 overflow-hidden rounded-2xl bg-slate-50 ring-1 ring-slate-100 md:h-28 md:w-28">
          {image ? (
            <Image src={image.url} alt={product.name} fill sizes="112px" className="object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-slate-100 text-xs font-bold text-slate-300">
              HomeMart
            </div>
          )}
        </div>
      </Link>

      <div className="min-w-0 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex justify-between items-start gap-2">
            <Link
              href={`/products/${product.slug}`}
              className="line-clamp-2 text-sm font-bold text-slate-900 hover:text-emerald-700 md:text-base"
            >
              {product.name}
            </Link>
            <p className="shrink-0 text-right text-sm font-extrabold text-accent-600 md:text-base">
              {formatCurrency(unitPrice * item.quantity)}
            </p>
          </div>

          {variant && Object.keys(variant.attributes).length > 0 && (
            <p className="mt-1 inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
              {Object.entries(variant.attributes).map(([k, v]) => `${k}: ${v}`).join(', ')}
            </p>
          )}

          <div className="mt-1">
            <Price price={unitPrice} size="sm" />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-50 pt-2">
          <QuantityStepper
            value={item.quantity}
            size="sm"
            max={typeof stock === 'number' && stock > 0 ? stock : 999}
            disabled={update.isPending}
            onChange={(q) =>
              update.mutate(
                { id: item.id, quantity: q },
                { onError: (err) => toast.error(err.message) },
              )
            }
          />

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-slate-500 hover:text-slate-900"
              onClick={() => save.mutate(item.id, { onError: () => toast.error('Không thể lưu sản phẩm') })}
            >
              <BookmarkPlus className="h-3.5 w-3.5 mr-1" /> Để dành
            </Button>
            <Button
              variant="ghost"
              size="sm"
              aria-label={`Xoá ${product.name} khỏi giỏ hàng`}
              className="text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
              loading={remove.isPending}
              onClick={() =>
                remove.mutate(item.id, {
                  onSuccess: () => toast.success('Đã xoá khỏi giỏ hàng'),
                  onError: () => toast.error('Không thể xoá sản phẩm'),
                })
              }
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Xóa
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CartView() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const hydrated = useAuthStore((s) => s.hydrated);
  const setCount = useCartStore((s) => s.setCount);
  const cartQuery = useCart(hydrated && Boolean(accessToken));

  const cart = cartQuery.data;
  const items = (cart?.items ?? []).filter((i) => !i.savedForLater);
  const savedItems = (cart?.items ?? []).filter((i) => i.savedForLater);

  const subtotal = items.reduce(
    (sum, i) => sum + (i.variant?.price ?? i.product.price) * i.quantity,
    0,
  );

  useEffect(() => {
    if (accessToken) setCount(items.length);
  }, [items.length, accessToken, setCount]);

  if (!hydrated || !accessToken) {
    return (
      <EmptyState
        icon={<ShoppingBag className="h-12 w-12 text-emerald-600" />}
        title="Bạn chưa đăng nhập"
        description="Đăng nhập để xem và quản lý giỏ hàng của bạn."
        actionLabel="Đăng nhập ngay"
        href="/auth/login"
      />
    );
  }

  return (
    <div>
      {/* Checkout step progress */}
      <div className="mb-6 flex items-center justify-center gap-3 text-xs font-bold text-slate-500">
        <span className="flex items-center gap-1.5 text-emerald-700">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-xs text-white">
            1
          </span>
          Giỏ hàng
        </span>
        <span className="text-slate-300">———</span>
        <span className="flex items-center gap-1.5 text-slate-400">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-xs text-slate-600">
            2
          </span>
          Thanh toán
        </span>
        <span className="text-slate-300">———</span>
        <span className="flex items-center gap-1.5 text-slate-400">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-xs text-slate-600">
            3
          </span>
          Hoàn tất
        </span>
      </div>

      <h1 className="mb-5 text-2xl font-black text-slate-900">Giỏ Hàng Của Bạn</h1>

      {cartQuery.isLoading ? (
        <ListSkeleton rows={4} />
      ) : cartQuery.isError ? (
        <ErrorState onRetry={() => cartQuery.refetch()} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <Card>
              <CardHeader className="flex items-center justify-between">
                <CardTitle className="text-base">
                  Danh sách sản phẩm ({items.length})
                </CardTitle>
                {items.length > 0 && (
                  <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Đủ điều kiện freeship
                  </span>
                )}
              </CardHeader>
              <CardContent>
                {items.length === 0 ? (
                  <div className="py-8">
                    <EmptyState
                      icon={<ShoppingBag className="h-12 w-12 text-emerald-600" />}
                      title="Giỏ hàng đang trống"
                      description="Hãy chọn cho mình những món đồ gia dụng tuyệt vời nhất!"
                      actionLabel="Khám phá sản phẩm"
                      href="/products"
                    />
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {items.map((item) => (
                      <li key={item.id}>
                        <CartRow item={item} />
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            {savedItems.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Sản phẩm để dành sau ({savedItems.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="divide-y divide-slate-100">
                    {savedItems.map((item) => (
                      <li key={item.id}>
                        <SavedRow item={item} />
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Tóm tắt đơn hàng */}
          <aside aria-label="Tóm tắt đơn hàng">
            <Card className="sticky top-28">
              <CardHeader>
                <CardTitle className="text-base">Tóm tắt đơn hàng</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-5">
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Tạm tính ({items.reduce((s, i) => s + i.quantity, 0)} sản phẩm)</span>
                  <span className="font-bold text-slate-900">{formatCurrency(subtotal)}</span>
                </div>

                <div className="flex justify-between text-sm text-slate-600">
                  <span>Phí vận chuyển dự kiến</span>
                  <span className="font-bold text-emerald-600">
                    {subtotal >= 299000 ? 'MIỄN PHÍ' : 'Tính ở bước sau'}
                  </span>
                </div>

                <div className="flex justify-between border-t border-dashed border-slate-200 pt-3 text-lg font-black text-slate-900">
                  <span>Tổng tiền</span>
                  <span className="text-accent-600">{formatCurrency(subtotal)}</span>
                </div>

                <p className="text-[11px] leading-relaxed text-slate-400">
                  ✓ Miễn phí đổi trả trong 7 ngày nếu không ưng ý.<br />
                  ✓ Được kiểm tra hàng trước khi thanh toán.
                </p>

                <Link href="/checkout" aria-disabled={items.length === 0}>
                  <Button
                    variant="accent"
                    size="lg"
                    className="w-full shadow-md shadow-accent-500/25"
                    disabled={items.length === 0}
                  >
                    Tiến hành thanh toán <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>

                <Link
                  href="/products"
                  className="block text-center text-xs font-bold text-emerald-700 hover:underline pt-1"
                >
                  ← Tiếp tục xem sản phẩm khác
                </Link>
              </CardContent>
            </Card>
          </aside>
        </div>
      )}
    </div>
  );
}

function SavedRow({ item }: { item: CartItem }) {
  const save = useSaveForLater();
  const remove = useRemoveCartItem();
  const product = item.product;
  const image = product.images?.find((i) => i.isPrimary) ?? product.images?.[0];

  return (
    <div className="flex items-center gap-3 py-3">
      <Link href={`/products/${product.slug}`} className="shrink-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600">
        <div className="relative h-16 w-16 overflow-hidden rounded-xl bg-slate-50 ring-1 ring-slate-100">
          {image && <Image src={image.url} alt={product.name} fill sizes="64px" className="object-cover" />}
        </div>
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={`/products/${product.slug}`} className="line-clamp-1 text-sm font-bold text-slate-800 hover:text-emerald-700">
          {product.name}
        </Link>
        <Price price={product.price} size="sm" className="mt-0.5" />
      </div>
      <div className="flex shrink-0 gap-1.5">
        <Button
          variant="outline"
          size="sm"
          loading={save.isPending}
          onClick={() => save.mutate(item.id, { onError: () => toast.error('Không thể chuyển vào giỏ') })}
        >
          Chuyển vào giỏ
        </Button>
        <Button
          variant="ghost"
          size="sm"
          aria-label={`Xoá ${product.name}`}
          className="text-red-600 hover:bg-red-50"
          loading={remove.isPending}
          onClick={() => remove.mutate(item.id, { onError: () => toast.error('Không thể xoá') })}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
