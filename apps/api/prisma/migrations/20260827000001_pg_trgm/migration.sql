-- Enable pg_trgm for fast trigram search (suggest + q filter)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN indexes for ILIKE/contains searches used by ProductsService.list + suggest
CREATE INDEX IF NOT EXISTS products_name_trgm_idx ON products USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS products_sku_trgm_idx ON products USING gin (sku gin_trgm_ops);
-- Composite for published products ordered by soldCount (best_selling)
CREATE INDEX IF NOT EXISTS products_status_sold_idx ON products (status, soldCount DESC) WHERE deletedAt IS NULL;
