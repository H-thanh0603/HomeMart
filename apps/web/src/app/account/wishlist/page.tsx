'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { HeartOff } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useToggleWishlist, useWishlist } from '@/hooks/use-catalog';
import { ProductCard } from '@/components/product/product-card';
import { ListSkeleton, ProductGridSkeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/empty-state';
import { toast } from '@/stores/toast-store';
import type { Product } from '@/lib/types';

export default function AccountWishlistPage() {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const hydrated = useAuthStore((s) => s.hydrated);

  const wishlistQuery = useWishlist(hydrated && Boolean(accessToken));
  const toggle = useToggleWishlist();

  useEffect(() => {
    if (hydrated && !accessToken) {
      router.replace('/auth/login?redirect=/account/wishlist');
    }
  }, [hydrated, accessToken, router]);

  if (!hydrated || !accessToken) return <ListSkeleton rows={3} />;

  const items = wishlistQuery.data?.items ?? [];

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold text-slate-900">Sản phẩm yêu thích</h1>

      {wishlistQuery.isLoading ? (
        <ProductGridSkeleton count={4} />
      ) : wishlistQuery.isError ? (
        <ErrorState onRetry={() => wishlistQuery.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<HeartOff className="h-12 w-12" />}
          title="Chưa có sản phẩm yêu thích"
          description="Nhấn vào biểu tượng trái tim trên sản phẩm để lưu lại."
          actionLabel="Khám phá sản phẩm"
          href="/products"
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {items.map((item) => (
            <div key={item.id} className="relative">
              <ProductCard product={item.product as Product} />
              <button
                aria-label={`Bỏ yêu thích ${item.product.name}`}
                disabled={toggle.isPending}
                onClick={() =>
                  toggle.mutate(
                    { productId: item.productId, wishlisted: true },
                    {
                      onSuccess: () => toast.success('Đã bỏ khỏi yêu thích'),
                      onError: () => toast.error('Thao tác thất bại'),
                    },
                  )
                }
                className="absolute bottom-3 right-2 z-10 rounded-full bg-white/90 px-2 py-1 text-[11px] font-medium text-red-600 shadow-sm hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              >
                Bỏ thích
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
