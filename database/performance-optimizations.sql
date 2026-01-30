-- Performance Optimizations & Full Text Search Migration

-- 1. Enable extensions
CREATE EXTENSION
IF NOT EXISTS pg_trgm;
CREATE EXTENSION
IF NOT EXISTS btree_gin;
CREATE EXTENSION
IF NOT EXISTS unaccent;

-- 2. Add text_search_vector to products if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'text_search_vector') THEN
    ALTER TABLE products ADD COLUMN text_search_vector tsvector;
END
IF;
END $$;

-- 3. Create GIN index for Full Text Search
CREATE INDEX
IF NOT EXISTS idx_products_search_vector ON products USING GIN
(text_search_vector);

-- 4. Create Function to update search vector
CREATE OR REPLACE FUNCTION products_search_vector_update
() RETURNS trigger AS $$
BEGIN
  -- Combine Title, Description, City
  -- Normalized: lowercase, unaccented
  NEW.text_search_vector :=
    setweight
(to_tsvector
('english', unaccent
(coalesce
(NEW.title, ''))), 'A') ||
    setweight
(to_tsvector
('english', unaccent
(coalesce
(NEW.description, ''))), 'B') ||
    setweight
(to_tsvector
('english', unaccent
(coalesce
(NEW.city, ''))), 'C');
RETURN NEW;
END
$$ LANGUAGE plpgsql;

-- 5. Create Trigger
DROP TRIGGER IF EXISTS tsvectorupdate
ON products;
CREATE TRIGGER tsvectorupdate BEFORE
INSERT OR
UPDATE
    ON products FOR EACH ROW
EXECUTE PROCEDURE products_search_vector_update
();

-- 6. Backfill existing data
UPDATE products SET text_search_vector = 
    setweight(to_tsvector('english', unaccent(coalesce(title, ''))), 'A') ||
    setweight(to_tsvector('english', unaccent(coalesce(description, ''))), 'B') ||
    setweight(to_tsvector('english', unaccent(coalesce(city, ''))), 'C');

-- 7. Add critical indexes for filtering and joins
CREATE INDEX
IF NOT EXISTS idx_products_supplier ON products
(supplier_id);
CREATE INDEX
IF NOT EXISTS idx_products_status_category ON products
(status, category_id);
CREATE INDEX
IF NOT EXISTS idx_products_status_featured ON products
(status, is_featured) WHERE is_featured = true;
CREATE INDEX
IF NOT EXISTS idx_products_status_trending ON products
(status, is_trending) WHERE is_trending = true;
CREATE INDEX
IF NOT EXISTS idx_order_items_supplier_order ON order_items
(supplier_id, order_id);
CREATE INDEX
IF NOT EXISTS idx_orders_created_at ON orders
(created_at DESC);
CREATE INDEX
IF NOT EXISTS idx_products_price_sort ON products
(price_after);

-- 8. Add Product Detail specific indexes
CREATE INDEX
IF NOT EXISTS idx_product_specs_product ON product_specifications
(product_id);
CREATE INDEX
IF NOT EXISTS idx_product_reviews_product ON product_reviews
(product_id);
CREATE INDEX
IF NOT EXISTS idx_product_watches_product ON product_watches
(product_id);
CREATE INDEX
IF NOT EXISTS idx_shipping_options_product ON shipping_options
(product_id);
CREATE INDEX
IF NOT EXISTS idx_product_shares_product ON product_shares
(product_id);

-- 9. Add composite indexes for auth performance (login queries)
CREATE INDEX
IF NOT EXISTS idx_users_email_active ON users
(business_email, is_active);
CREATE INDEX
IF NOT EXISTS idx_users_mobile_active ON users
(mobile, is_active);

