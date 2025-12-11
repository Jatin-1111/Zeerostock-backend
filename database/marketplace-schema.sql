-- =====================================================
-- Zeerostock Marketplace Database Schema
-- B2B Industrial Surplus Marketplace
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. INDUSTRIES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS industries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    image_url TEXT,
    icon_url TEXT,
    product_count INTEGER DEFAULT 0,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    meta_title VARCHAR(200),
    meta_description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for industries
CREATE INDEX idx_industries_slug ON industries(slug);
CREATE INDEX idx_industries_active ON industries(is_active) WHERE is_active = true;
CREATE INDEX idx_industries_display_order ON industries(display_order);

-- =====================================================
-- 2. UPDATE CATEGORIES TABLE (if needed)
-- =====================================================
-- Add columns to categories if they don't exist
ALTER TABLE categories ADD COLUMN IF NOT EXISTS industry_id UUID REFERENCES industries(id) ON DELETE SET NULL;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS product_count INTEGER DEFAULT 0;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;

-- Indexes for categories
CREATE INDEX IF NOT EXISTS idx_categories_industry ON categories(industry_id);
CREATE INDEX IF NOT EXISTS idx_categories_featured ON categories(is_featured) WHERE is_featured = true;

-- =====================================================
-- 3. UPDATE PRODUCTS TABLE (Enhanced for Marketplace)
-- =====================================================
-- Add marketplace-specific columns
ALTER TABLE products ADD COLUMN IF NOT EXISTS industry_id UUID REFERENCES industries(id) ON DELETE SET NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS condition VARCHAR(20) DEFAULT 'good';
ALTER TABLE products ADD COLUMN IF NOT EXISTS listing_type VARCHAR(20) DEFAULT 'fixed';
ALTER TABLE products ADD COLUMN IF NOT EXISTS rating DECIMAL(3,2) DEFAULT 0.00;
ALTER TABLE products ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_sponsored BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_trending BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS sponsored_priority INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS featured_priority INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS watchers_count INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS available_quantity INTEGER DEFAULT 1;
ALTER TABLE products ADD COLUMN IF NOT EXISTS min_order_quantity INTEGER DEFAULT 1;
ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier_verified BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS verified_badge_type VARCHAR(50);
ALTER TABLE products ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Add constraints for enum-like fields
ALTER TABLE products ADD CONSTRAINT chk_condition 
    CHECK (condition IN ('new', 'like-new', 'good', 'fair'));

ALTER TABLE products ADD CONSTRAINT chk_listing_type 
    CHECK (listing_type IN ('auction', 'fixed', 'negotiable'));

ALTER TABLE products ADD CONSTRAINT chk_rating 
    CHECK (rating >= 0 AND rating <= 5);

-- Comprehensive indexes for marketplace filtering & sorting
CREATE INDEX IF NOT EXISTS idx_products_industry ON products(industry_id);
CREATE INDEX IF NOT EXISTS idx_products_condition ON products(condition);
CREATE INDEX IF NOT EXISTS idx_products_listing_type ON products(listing_type);
CREATE INDEX IF NOT EXISTS idx_products_rating ON products(rating DESC);
CREATE INDEX IF NOT EXISTS idx_products_price_asc ON products(price_after ASC);
CREATE INDEX IF NOT EXISTS idx_products_price_desc ON products(price_after DESC);
CREATE INDEX IF NOT EXISTS idx_products_discount ON products(discount_percent DESC);
CREATE INDEX IF NOT EXISTS idx_products_views ON products(views_count DESC);
CREATE INDEX IF NOT EXISTS idx_products_created ON products(listed_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_sponsored ON products(is_sponsored, sponsored_priority DESC) WHERE is_sponsored = true;
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(is_featured, featured_priority DESC) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_products_trending ON products(is_trending) WHERE is_trending = true;
CREATE INDEX IF NOT EXISTS idx_products_verified ON products(supplier_verified) WHERE supplier_verified = true;
CREATE INDEX IF NOT EXISTS idx_products_status_active ON products(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_products_city ON products(city);
CREATE INDEX IF NOT EXISTS idx_products_search_vector ON products USING gin(search_vector);

-- Composite indexes for common filter combinations
CREATE INDEX IF NOT EXISTS idx_products_category_status ON products(category_id, status);
CREATE INDEX IF NOT EXISTS idx_products_industry_status ON products(industry_id, status);
CREATE INDEX IF NOT EXISTS idx_products_category_price ON products(category_id, price_after);
CREATE INDEX IF NOT EXISTS idx_products_expires_at ON products(expires_at) WHERE expires_at IS NOT NULL;

-- =====================================================
-- 4. PRODUCT FILTERS METADATA TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS product_filters_metadata (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    filter_type VARCHAR(50) NOT NULL,
    filter_key VARCHAR(100) NOT NULL,
    filter_value VARCHAR(200) NOT NULL,
    display_name VARCHAR(200),
    product_count INTEGER DEFAULT 0,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(filter_type, filter_key, filter_value)
);

CREATE INDEX idx_filters_type ON product_filters_metadata(filter_type);
CREATE INDEX idx_filters_active ON product_filters_metadata(is_active) WHERE is_active = true;

-- =====================================================
-- 5. PRODUCT SEARCHES TABLE (for search analytics)
-- =====================================================
CREATE TABLE IF NOT EXISTS product_searches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    search_query TEXT NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    session_id VARCHAR(255),
    results_count INTEGER DEFAULT 0,
    filters_applied JSONB,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_searches_query ON product_searches(search_query);
CREATE INDEX idx_searches_user ON product_searches(user_id);
CREATE INDEX idx_searches_created ON product_searches(created_at DESC);

-- =====================================================
-- 6. SPONSORED CAMPAIGNS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS sponsored_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES users(id) ON DELETE CASCADE,
    campaign_name VARCHAR(200),
    budget DECIMAL(15,2) DEFAULT 0,
    spent DECIMAL(15,2) DEFAULT 0,
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    priority INTEGER DEFAULT 0,
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_campaigns_product ON sponsored_campaigns(product_id);
CREATE INDEX idx_campaigns_supplier ON sponsored_campaigns(supplier_id);
CREATE INDEX idx_campaigns_status ON sponsored_campaigns(status) WHERE status = 'active';
CREATE INDEX idx_campaigns_dates ON sponsored_campaigns(start_date, end_date);

-- =====================================================
-- 7. FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to update product search vector
CREATE OR REPLACE FUNCTION update_product_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.city, '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for search vector update
DROP TRIGGER IF EXISTS trg_product_search_vector ON products;
CREATE TRIGGER trg_product_search_vector
    BEFORE INSERT OR UPDATE OF title, description, city
    ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_product_search_vector();

-- Function to update category product count
CREATE OR REPLACE FUNCTION update_category_product_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Update count for old category
    IF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND OLD.category_id IS DISTINCT FROM NEW.category_id) THEN
        UPDATE categories 
        SET product_count = (
            SELECT COUNT(*) FROM products 
            WHERE category_id = OLD.category_id AND status = 'active'
        )
        WHERE id = OLD.category_id;
    END IF;

    -- Update count for new category
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.category_id IS DISTINCT FROM NEW.category_id) THEN
        UPDATE categories 
        SET product_count = (
            SELECT COUNT(*) FROM products 
            WHERE category_id = NEW.category_id AND status = 'active'
        )
        WHERE id = NEW.category_id;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger for category count
DROP TRIGGER IF EXISTS trg_category_product_count ON products;
CREATE TRIGGER trg_category_product_count
    AFTER INSERT OR UPDATE OF category_id, status OR DELETE
    ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_category_product_count();

-- Function to update industry product count
CREATE OR REPLACE FUNCTION update_industry_product_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Update count for old industry
    IF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND OLD.industry_id IS DISTINCT FROM NEW.industry_id) THEN
        UPDATE industries 
        SET product_count = (
            SELECT COUNT(*) FROM products 
            WHERE industry_id = OLD.industry_id AND status = 'active'
        )
        WHERE id = OLD.industry_id;
    END IF;

    -- Update count for new industry
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.industry_id IS DISTINCT FROM NEW.industry_id) THEN
        UPDATE industries 
        SET product_count = (
            SELECT COUNT(*) FROM products 
            WHERE industry_id = NEW.industry_id AND status = 'active'
        )
        WHERE id = NEW.industry_id;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger for industry count
DROP TRIGGER IF EXISTS trg_industry_product_count ON products;
CREATE TRIGGER trg_industry_product_count
    AFTER INSERT OR UPDATE OF industry_id, status OR DELETE
    ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_industry_product_count();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all tables
DROP TRIGGER IF EXISTS trg_industries_updated_at ON industries;
CREATE TRIGGER trg_industries_updated_at
    BEFORE UPDATE ON industries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_categories_updated_at ON categories;
CREATE TRIGGER trg_categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_filters_updated_at ON product_filters_metadata;
CREATE TRIGGER trg_filters_updated_at
    BEFORE UPDATE ON product_filters_metadata
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_campaigns_updated_at ON sponsored_campaigns;
CREATE TRIGGER trg_campaigns_updated_at
    BEFORE UPDATE ON sponsored_campaigns
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 8. VIEWS FOR MARKETPLACE
-- =====================================================

-- View for active marketplace products
CREATE OR REPLACE VIEW marketplace_products_view AS
SELECT 
    p.id,
    p.title,
    p.slug,
    p.image_url,
    p.price_before,
    p.price_after,
    p.discount_percent,
    p.rating,
    p.review_count,
    p.city,
    p.state,
    p.condition,
    p.listing_type,
    p.views_count,
    p.watchers_count,
    p.available_quantity,
    p.supplier_verified,
    p.verified_badge_type,
    p.is_sponsored,
    p.is_featured,
    p.is_trending,
    p.sponsored_priority,
    p.featured_priority,
    p.expires_at,
    p.listed_at,
    p.status,
    c.id as category_id,
    c.name as category_name,
    c.slug as category_slug,
    i.id as industry_id,
    i.name as industry_name,
    i.slug as industry_slug,
    u.id as supplier_id,
    u.first_name || ' ' || u.last_name as supplier_name,
    u.business_name as supplier_business_name,
    EXTRACT(EPOCH FROM (p.expires_at - CURRENT_TIMESTAMP)) as time_remaining_seconds,
    CASE 
        WHEN p.listing_type = 'auction' THEN (
            SELECT current_bid FROM auctions WHERE product_id = p.id LIMIT 1
        )
        ELSE NULL
    END as current_bid,
    CASE 
        WHEN p.listing_type = 'auction' THEN (
            SELECT total_bids FROM auctions WHERE product_id = p.id LIMIT 1
        )
        ELSE NULL
    END as total_bids
FROM products p
INNER JOIN categories c ON p.category_id = c.id
LEFT JOIN industries i ON p.industry_id = i.id
INNER JOIN users u ON p.supplier_id = u.id
WHERE p.status = 'active';

-- =====================================================
-- SCHEMA COMPLETE
-- =====================================================
