import type { Metadata } from 'next';
import { OrderDetail } from '@/components/order/order-detail';

export const metadata: Metadata = {
  title: 'Chi tiết đơn hàng',
  robots: { index: false },
};

export default async function OrderRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="mx-auto max-w-4xl">
      <OrderDetail orderId={id} />
    </div>
  );
}
