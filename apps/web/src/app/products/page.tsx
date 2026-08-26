import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ProductListing } from './listing';
import { ProductGridSkeleton } from '@/components/ui/skeleton';

export const metadata: Metadata = {
  title: 'Tất cả sản phẩm',
  description: 'Khám phá hàng ngàn sản phẩm gia dụng, nhà bếp, nội thất chính hãng tại HomeMart.',
};

export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="mt-2">
          <ProductGridSkeleton count={8} />
        </div>
      }
    >
      <ProductListing />
    </Suspense>
  );
}
