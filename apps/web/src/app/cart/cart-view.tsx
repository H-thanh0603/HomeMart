'use client';

import Image from 'next/image';
import Link from 'next/link';
import { BookmarkPlus, ShoppingBag, Trash2 } from 'lucide-react';
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

function CartRow({
  item,
}: {
  item: CartItem;
}) {
  const update = useUpdateCartItem();
  const remove = useRemoveCartItem();
  const save = useSaveForLater();
  const product = item.product;
  const variant = item.variant;
  const unitPrice = variant?.price ?? product.price;
  const stock = product.inventory?.availableStock ?? variant?.inventory?.availableStock;

  const image = product.images?.find((i) => i.isPrimary) ?? product.images?.[0];

  return (
    <div className="flex gap-3 py-3">
      <Link href={`/products/${product.slug}`} className="shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 rounded-xl">
        <div className="relative h-20 w-20 overflow-hidden rounded-xl bg-slate-50 md:h-24 md:w-24">
          {image && <Image src={image.url} alt={product.name} fill sizes="96px" className="object-cover" />}
        </div>
      </Link>
      <div className="min-w-0 flex-1">
        <Link
          href={`/products/${product.slug}`}
          className="line-clamp-2 text-sm font-medium text-slate-700 hover:text-primary-700"
        >
          {product.name}
        </Link>
        {variant && Object.keys(variant.attributes).length > 0 && (
          <p className="mt-0.5 text-xs text-slate-400">
            {Object.entries(variant.attributes).map(([k, v]) => `${k}: ${v}`).join(', ')}
          </p>
        )}
        <Price price={unitPrice} size="sm" className="mt-1" />
        <div className="mt-2 flex flex-wrap items-center gap-2">
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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => save.mutate(item.id, { onError: () => toast.error('Không thể lưu sản phẩm') })}
          >
            <BookmarkPlus className="h-4 w-4" /> Để dành
          </Button>
          <Button
            variant="ghost"
            size="sm"
            aria-label={`Xoá ${product.name} khỏi giỏ hàng`}
            className="text-red-600 hover:bg-red-50"
            loading={remove.isPending}
            onClick={() =>
              remove.mutate(item.id, {
                onSuccess: () => toast.success('Đã xoá khỏi giỏ hàng'),
                onError: () => toast.error('Không thể xoá sản phẩm'),
              })
            }
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <p className="hidden shrink-0 text-right text-sm font-semibold text-accent-600 sm:block">
        {formatCurrency(unitPrice * item.quantity)}
      </p>
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

  // Mirror số lượng lên header
  useEffect(() => {
    if (accessToken) setCount(items.length);
  }, [items.length, accessToken, setCount]);

  if (!hydrated || !accessToken) {
    return (
      <EmptyState
        icon={<ShoppingBag className="h-12 w-12" />}
        title="Bạn chưa đăng nhập"
        description="Đăng nhập để xem giỏ hàng của bạn."
        actionLabel="Đăng nhập"
        href="/auth/login"
      />
    );
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold text-slate-900">Giỏ hàng</h1>

      {cartQuery.isLoading ? (
        <ListSkeleton rows={4} />
      ) : cartQuery.isError ? (
        <ErrorState onRetry={() => cartQuery.refetch()} />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>
                  Sản phẩm ({items.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {items.length === 0 ? (
                  <div className="py-6">
                    <EmptyState
                      icon={<ShoppingBag className="h-12 w-12" />}
                      title="Giỏ hàng trống"
                      description="Khám phá các sản phẩm tuyệt vời cho ngôi nhà của bạn."
                      actionLabel="Mua sắm ngay"
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
                  <CardTitle>Để dành sau ({savedItems.length})</CardTitle>
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

          {/* Tóm tắt */}
          <aside aria-label="Tóm tắt đơn hàng">
            <Card className="sticky top-24">
              <CardContent className="space-y-3 p-4">
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Tạm tính ({items.reduce((s, i) => s + i.quantity, 0)} sản phẩm)</span>
                  <span className="font-medium text-slate-800">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between border-t border-dashed border-slate-200 pt-3 text-base font-bold text-slate-900">
                  <span>Tổng cộng</span>
                  <span className="text-accent-600">{formatCurrency(subtotal)}</span>
                </div>
                <p className="text-xs text-slate-400">
                  Phí vận chuyển, thuế và giảm giá sẽ được tính ở bước thanh toán.
                </p>
                <Link href="/checkout" aria-disabled={items.length === 0}>
                  <Button
                    variant="accent"
                    size="lg"
                    className="w-full"
                    disabled={items.length === 0}
                  >
                    Tiến hành thanh toán
                  </Button>
                </Link>
                <Link
                  href="/products"
                  className="block text-center text-sm font-medium text-primary-700 hover:underline"
                >
                  ← Tiếp tục mua sắm
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
      <Link href={`/products/${product.slug}`} className="shrink-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600">
        <div className="relative h-14 w-14 overflow-hidden rounded-xl bg-slate-50">
          {image && <Image src={image.url} alt={product.name} fill sizes="56px" className="object-cover" />}
        </div>
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={`/products/${product.slug}`} className="line-clamp-1 text-sm text-slate-600 hover:text-primary-700">
          {product.name}
        </Link>
        <Price price={product.price} size="sm" className="mt-0.5" />
      </div>
      <div className="flex shrink-0 flex-col gap-1 sm:flex-row">
        <Button
          variant="outline"
          size="sm"
          loading={save.isPending}
          onClick={() =>
            // API toggle cờ savedForLater của cart item
            save.mutate(item.id, { onError: () => toast.error('Không thể chuyển vào giỏ') })
          }
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
