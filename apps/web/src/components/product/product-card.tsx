'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Heart, ShoppingCart } from 'lucide-react';
import { Price } from './price';
import { RatingStars } from './rating-stars';
import type { Product } from '@/lib/types';
import { useAuthStore } from '@/stores/auth-store';
import { useAddToCart, useToggleWishlist, useWishlistIds } from '@/hooks/use-catalog';
import { toast } from '@/stores/toast-store';

export function ProductCard({ product }: { product: Product }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const { ids } = useWishlistIds(Boolean(accessToken));
  const toggle = useToggleWishlist();
  const addToCart = useAddToCart();
  const wishlisted = ids.has(product.id);

  const image = product.images?.find((img) => img.isPrimary) ?? product.images?.[0];
  const soldOut = product.inventory ? product.inventory.availableStock <= 0 : false;

  const onToggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!accessToken) {
      toast.info('Vui lòng đăng nhập để sử dụng yêu thích');
      return;
    }
    toggle.mutate(
      { productId: product.id, wishlisted },
      {
        onSuccess: () =>
          toast.success(wishlisted ? 'Đã bỏ khỏi yêu thích' : 'Đã thêm vào yêu thích'),
        onError: () => toast.error('Không thể cập nhật yêu thích'),
      },
    );
  };

  const onQuickAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!accessToken) {
      toast.info('Vui lòng đăng nhập để thêm vào giỏ hàng');
      return;
    }
    addToCart.mutate(
      { productId: product.id, quantity: 1 },
      {
        onSuccess: () => toast.success(`Đã thêm ${product.name} vào giỏ hàng`),
        onError: (err) => toast.error(err.message),
      },
    );
  };

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group relative flex flex-col overflow-hidden rounded-2xl bg-white p-3 shadow-card ring-1 ring-slate-100/90 transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover hover:ring-primary-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600"
      aria-label={product.name}
    >
      {/* Wishlist Button */}
      <button
        type="button"
        aria-label={wishlisted ? 'Bỏ khỏi yêu thích' : 'Thêm vào yêu thích'}
        onClick={onToggleWishlist}
        className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur-sm transition-transform duration-200 hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600"
      >
        <Heart
          className={`h-4 w-4 transition-colors ${
            wishlisted ? 'fill-red-500 text-red-500' : 'text-slate-400 group-hover:text-slate-600'
          }`}
        />
      </button>

      {/* Product Image */}
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-slate-50/80">
        {image ? (
          <Image
            src={image.url}
            alt={image.alt ?? product.name}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-slate-100/60 text-slate-300">
            <span className="text-xs font-semibold">HomeMart</span>
          </div>
        )}

        {/* Sold out banner */}
        {soldOut ? (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/60 backdrop-blur-[2px]">
            <span className="rounded-lg bg-slate-900/90 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white">
              Hết hàng
            </span>
          </div>
        ) : (
          /* Quick Add to Cart button on hover */
          <button
            type="button"
            aria-label={`Thêm ${product.name} vào giỏ`}
            onClick={onQuickAddToCart}
            className="absolute bottom-2 right-2 hidden h-9 w-9 items-center justify-center rounded-xl bg-primary-600 text-white shadow-md transition-all duration-200 hover:bg-primary-700 hover:scale-105 active:scale-95 group-hover:flex focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <ShoppingCart className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="mt-3 flex flex-1 flex-col justify-between">
        <div>
          {product.brand && (
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
              {product.brand.name}
            </span>
          )}
          <h3 className="mt-0.5 line-clamp-2 min-h-[2.5rem] text-sm font-semibold text-slate-800 transition-colors group-hover:text-primary-700">
            {product.name}
          </h3>
        </div>

        <div className="mt-2 pt-1">
          <Price price={product.price} compareAtPrice={product.compareAtPrice} size="sm" />
          <div className="mt-2 flex items-center justify-between gap-1 border-t border-slate-50 pt-2">
            <RatingStars value={product.ratingAvg} count={product.reviewCount} size={12} showValue />
            {product.soldCount > 0 && (
              <span className="shrink-0 text-[11px] font-medium text-slate-400">
                Đã bán {product.soldCount > 1000 ? `${(product.soldCount / 1000).toFixed(1)}k` : product.soldCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

export function ProductGrid({ products }: { products: Product[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
