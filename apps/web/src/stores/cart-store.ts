'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CartState {
  /** Số lượng sản phẩm trong giỏ — mirror hiển thị trên header. */
  count: number;
  setCount: (count: number) => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      count: 0,
      setCount: (count) => set({ count }),
    }),
    { name: 'homemart-cart-count' },
  ),
);
