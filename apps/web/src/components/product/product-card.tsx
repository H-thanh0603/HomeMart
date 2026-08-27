'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Heart } from 'lucide-react';
import { Price } from './price';
import { RatingStars } from './rating-stars';
import type { Product } from '@/lib/types';
import { useAuthStore } from '@/stores/auth-store';
import { useToggleWishlist, useWishlistIds } from '@/hooks/use-catalog';
import { toast } from '@/stores/toast-store';

export function ProductCard({ product }: { product: Product }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const { ids } = useWishlistIds(Boolean(accessToken));
  const toggle = useToggleWishlist();
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

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group relative flex flex-col rounded-xl bg-white p-3 shadow-card ring-1 ring-slate-100 transition-shadow duration-200 hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600"
      aria-label={product.name}
    >
      <button
        type="button"
        aria-label={wishlisted ? 'Bỏ khỏi yêu thích' : 'Thêm vào yêu thích'}
        onClick={onToggleWishlist}
        className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-sm transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600"
      >
        <Heart
          className={`h-4 w-4 transition-colors ${wishlisted ? 'fill-red-500 text-red-500' : 'text-slate-400'}`}
        />
      </button>

      <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-slate-50">
        {image ? (
          <Image
            src={image.url}
            alt={image.alt ?? product.name}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-300">
            <span className="text-xs">HomeMart</span>
          </div>
        )}
        {soldOut && (
          <span className="absolute inset-x-0 bottom-0 bg-slate-900/70 py-1 text-center text-xs font-medium text-white">
            Hết hàng
          </span>
        )}
      </div>

      <h3 className="mt-2 line-clamp-2 min-h-[2.5rem] text-sm text-slate-700 group-hover:text-primary-700">
        {product.name}
      </h3>
      <Price price={product.price} compareAtPrice={product.compareAtPrice} size="sm" className="mt-1.5" />
      <div className="mt-1.5 flex items-center justify-between gap-1">
        <RatingStars value={product.ratingAvg} count={product.reviewCount} size={12} showValue />
        {product.soldCount > 0 && (
          <span className="shrink-0 text-[11px] text-slate-400">Đã bán {product.soldCount}</span>
        )}
      </div>
    </Link>
  );
}

export function ProductGrid({ products }: { products: Product[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
