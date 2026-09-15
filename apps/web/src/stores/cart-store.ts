'use client';

import { create } from 'zustand';

interface CartState {
  /** Số lượng sản phẩm trong giỏ — mirror hiển thị trên header. */
  count: number;
  setCount: (count: number) => void;
}

/**
 * In-memory only: a persisted badge count goes stale (server-side cart
 * expiry, items removed on another device) and shows a wrong number until
 * the user visits /cart. Providers re-syncs it from the server on boot.
 */
export const useCartStore = create<CartState>()((set) => ({
  count: 0,
  setCount: (count) => set({ count }),
}));

