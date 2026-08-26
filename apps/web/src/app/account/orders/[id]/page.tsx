'use client';

import { OrderDetail } from '@/components/order/order-detail';

export default function AccountOrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return <OrderDetail orderId={params.id} />;
}
