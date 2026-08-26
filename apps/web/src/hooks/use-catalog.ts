'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getData, getPage, patchData, deleteData, postData, putData } from '@/lib/api';
import type {
  Address,
  Cart,
  PageMeta,
  Product,
  ProductReview,
  Wishlist,
} from '@/lib/types';

// ─── Catalog ─────────────────────────────────────────────────────────────────

export interface ProductListParams {
  page?: number;
  limit?: number;
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'best_selling' | 'rating';
  minPrice?: number;
  maxPrice?: number;
  categoryId?: string;
  brandId?: string;
  rating?: number;
  inStock?: boolean;
  q?: string;
}

export function useProducts(params: ProductListParams, enabled = true) {
  return useQuery({
    queryKey: ['products', params],
    queryFn: () =>
      getPage<Product>({
        url: '/products',
        params,
      }),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export type ProductsResult = ReturnType<typeof useProducts>;
export type ProductPageMeta = PageMeta | undefined;

export function useProduct(slug: string) {
  return useQuery({
    queryKey: ['product', slug],
    queryFn: () => getData<Product>({ url: `/products/${slug}` }),
    enabled: Boolean(slug),
  });
}

export function useRelatedProducts(slug: string) {
  return useQuery({
    queryKey: ['products', slug, 'related'],
    queryFn: () => getData<Product[]>({ url: `/products/${slug}/related` }),
    enabled: Boolean(slug),
  });
}

export function useProductReviews(slug: string, page = 1) {
  return useQuery({
    queryKey: ['products', slug, 'reviews', page],
    queryFn: () => getPage<ProductReview>({ url: `/products/${slug}/reviews`, params: { page, limit: 5 } }),
    enabled: Boolean(slug),
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => getData<CategoryNode[]>({ url: '/categories' }),
    staleTime: 10 * 60 * 1000,
  });
}

export function useBrands() {
  return useQuery({
    queryKey: ['brands'],
    queryFn: () => getData<BrandLite[]>({ url: '/brands' }),
    staleTime: 10 * 60 * 1000,
  });
}

export interface CategoryNode {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  imageUrl?: string | null;
  children?: CategoryNode[];
}

export interface BrandLite {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
}

// ─── Cart ────────────────────────────────────────────────────────────────────

export function useCart(enabled = true) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: ['cart'],
    queryFn: () => getData<Cart>({ url: '/cart' }),
    enabled,
  });
}

export function useAddToCart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { productId: string; variantId?: string; quantity: number }) =>
      postData<CartItemResult>('/cart/items', body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart'] }),
  });
}

interface CartItemResult {
  id: string;
  quantity: number;
}

export function useUpdateCartItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, quantity }: { id: string; quantity: number }) =>
      patchData(`/cart/items/${id}`, { quantity }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart'] }),
  });
}

export function useRemoveCartItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteData(`/cart/items/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart'] }),
  });
}

export function useSaveForLater() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => postData<unknown>(`/cart/items/${id}/save`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart'] }),
  });
}

// ─── Wishlist ────────────────────────────────────────────────────────────────

export function useWishlist(enabled = true) {
  return useQuery({
    queryKey: ['wishlist'],
    queryFn: () => getData<Wishlist>({ url: '/wishlist' }),
    enabled,
  });
}

export function useToggleWishlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      productId,
      wishlisted,
    }: {
      productId: string;
      /** true nếu đang trong wishlist và muốn bỏ */
      wishlisted: boolean;
    }) =>
      wishlisted
        ? deleteData<unknown>(`/wishlist/${productId}`)
        : postData<unknown>('/wishlist', { productId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wishlist'] }),
  });
}

/** Danh sách productId đã yêu thích (dùng cho nút tim trên product card). */
export function useWishlistIds(enabled = true) {
  const query = useWishlist(enabled);
  const ids = new Set<string>(
    (query.data?.items ?? []).map((item) => item.productId as string),
  );
  return { ids, isLoading: query.isLoading };
}

// ─── Addresses ───────────────────────────────────────────────────────────────

function invalidateAddresses(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['addresses'] });
}

export function useAddresses(enabled = true) {
  return useQuery({
    queryKey: ['addresses'],
    queryFn: () => getData<Address[]>({ url: '/users/me/addresses' }),
    enabled,
  });
}

export function useCreateAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Omit<Address, 'id' | 'isDefault'> & { isDefault?: boolean }) =>
      postData<Address>('/users/me/addresses', body),
    onSuccess: () => invalidateAddresses(queryClient),
  });
}

export function useUpdateAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<Omit<Address, 'id'>> & { id: string }) =>
      patchData<Address>(`/users/me/addresses/${id}`, body),
    onSuccess: () => invalidateAddresses(queryClient),
  });
}

export function useDeleteAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteData<unknown>(`/users/me/addresses/${id}`),
    onSuccess: () => invalidateAddresses(queryClient),
  });
}

export function useSetDefaultAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => putData<Address>(`/users/me/addresses/${id}/default`),
    onSuccess: () => invalidateAddresses(queryClient),
  });
}
