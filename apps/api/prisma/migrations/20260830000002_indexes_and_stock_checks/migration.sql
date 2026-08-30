-- Missing FK indexes + composite index for the admin order queue,
-- and CHECK constraints as a DB-level backstop for stock math.
-- Column names are camelCase (Prisma quoted identifiers, no @map on columns).

CREATE INDEX "cart_items_product_id_idx" ON "cart_items"("productId");
CREATE INDEX "order_items_variant_id_idx" ON "order_items"("variantId");
CREATE INDEX "wishlist_items_product_id_idx" ON "wishlist_items"("productId");
CREATE INDEX "orders_status_created_at_idx" ON "orders"("status", "createdAt" DESC);
DROP INDEX IF EXISTS "orders_status_idx";

ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_quantity_check" CHECK ("quantity" > 0);
ALTER TABLE "inventories" ADD CONSTRAINT "inventories_available_stock_check" CHECK ("availableStock" >= 0);
ALTER TABLE "inventories" ADD CONSTRAINT "inventories_reserved_stock_check" CHECK ("reservedStock" >= 0);
