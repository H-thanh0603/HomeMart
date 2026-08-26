import type { Metadata } from 'next';
import { CartView } from './cart-view';

export const metadata: Metadata = {
  title: 'Giỏ hàng',
  description: 'Xem và chỉnh sửa giỏ hàng của bạn tại HomeMart.',
};

export default function CartPage() {
  return <CartView />;
}
