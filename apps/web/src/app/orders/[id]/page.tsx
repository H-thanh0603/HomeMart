import type { Metadata } from 'next';
import { OrderDetail } from '@/components/order/order-detail';

export const metadata: Metadata = {
  title: 'Chi tiết đơn hàng',
  robots: { index: false },
};

export default function OrderRedirectPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <div className="mx-auto max-w-4xl">
      <OrderDetail orderId={params.id} />
    </div>
  );
}
