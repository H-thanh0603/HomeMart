/**
 * Agent domain models — ported from anthropics/commerce-agents
 * (shopping-agent/core/types.py, Apache-2.0) to HomeMart's catalog:
 * products are VND integers, variants carry a JSON attributes record,
 * and orders track a pending-payment timeout.
 */

export interface AgentProduct {
  /** Product id — or a variant id, which the cart also accepts. */
  productId: string;
  title: string;
  brand?: string;
  /** VND integer — the model formats it, never recomputes it. */
  price: number;
  compareAtPrice?: number;
  currency: 'VND';
  rating?: number;
  reviewCount?: number;
  imageUrl?: string;
  slug?: string;
  category?: string;
  labels: string[];
  attributes: Record<string, string>;
  inStock: boolean;
  shortDescription?: string;
  /** Variant-family record: options left to choose; the cart refuses it. */
  options: Record<string, string[]>;
  /** Chosen values on a variant, one per option. */
  optionValues: Record<string, string>;
  variantOf?: string;
  hasOptions: boolean;
}

export interface AgentProductDetails extends AgentProduct {
  longDescription?: string;
  specs: Record<string, string>;
  reviewHighlights: string[];
  variants: AgentProduct[];
}

export interface AgentSearchFilters {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  attributes?: Record<string, string>;
  sort?: 'relevance' | 'price_asc' | 'price_desc' | 'rating';
}

export interface AgentCartItem {
  productId: string;
  variantId?: string;
  title: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  optionValues: Record<string, string>;
  variantOf?: string;
}

export interface AgentCart {
  items: AgentCartItem[];
  currency: 'VND';
  itemCount: number;
  subtotal: number;
}

export interface AgentOrderItem {
  productId: string;
  variantId?: string;
  title: string;
  quantity: number;
  price: number;
  optionValues: Record<string, string>;
}

export interface AgentOrder {
  orderId: string;
  orderNumber: string;
  status: string;
  placedAt: string;
  items: AgentOrderItem[];
  total: number;
  currency: 'VND';
  estimatedDelivery?: string;
  trackingUrl?: string;
}

export interface AgentPolicy {
  policyId: string;
  title: string;
  category?: string;
  content: string;
}

/** Per-session provenance record — cart writes accept only ids in it. */
export class AgentSessionState {
  readonly seenProducts = new Map<string, AgentProduct & { variants?: AgentProduct[] }>();

  rememberProducts(products: Array<AgentProduct | AgentProductDetails>): void {
    for (const product of products) {
      if (product.productId) this.seenProducts.set(product.productId, product);
      // A family's variants enter provenance with it, so the cart takes their ids.
      const variants = (product as AgentProductDetails).variants ?? [];
      for (const variant of variants) {
        if (variant.productId) this.seenProducts.set(variant.productId, variant);
      }
    }
  }
}
