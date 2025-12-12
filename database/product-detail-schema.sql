-- Zeerostock Product Detail Page Schema
-- Tables: product_specifications, product_reviews, product_watches, product_shares, shipping_options
-- Features: Product detail data, reviews, watchlist, sharing, shipping info

-- ============================================
-- 1. PRODUCT SPECIFICATIONS TABLE
-- ============================================
-- Purpose: Store detailed technical specifications for products
CREATE TABLE IF NOT EXISTS product_specifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    
    -- Specification details
    spec_key TEXT NOT NULL, -- e.g., "Power", "Voltage", "Material"
    spec_value TEXT NOT NULL, -- e.g., "3HP", "220V", "Copper"
    spec_category TEXT, -- Group specs: "Electrical", "Mechanical", "Physical"
    spec_unit TEXT, -- Unit of measurement: "HP", "V", "kg"
    
    -- Metadata
    display_order INTEGER DEFAULT 0,
    is_highlighted BOOLEAN DEFAULT FALSE, -- Show in product card
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(product_id, spec_key)
);

-- Indexes for product_specifications
CREATE INDEX idx_product_specs_product_id ON product_specifications(product_id);
CREATE INDEX idx_product_specs_category ON product_specifications(spec_category);
CREATE INDEX idx_product_specs_order ON product_specifications(product_id, display_order);

-- ============================================
-- 2. PRODUCT REVIEWS TABLE
-- ============================================
-- Purpose: Store customer reviews and ratings for products
CREATE TABLE IF NOT EXISTS product_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Review content
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title TEXT,
    comment TEXT NOT NULL,
    
    -- Review metadata
    verified_purchase BOOLEAN DEFAULT FALSE,
    helpful_count INTEGER DEFAULT 0,
    
    -- Review status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    moderation_note TEXT,
    
    -- Response from seller
    seller_response TEXT,
    seller_response_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(product_id, user_id) -- One review per user per product
);

-- Indexes for product_reviews
CREATE INDEX idx_reviews_product_id ON product_reviews(product_id);
CREATE INDEX idx_reviews_user_id ON product_reviews(user_id);
CREATE INDEX idx_reviews_rating ON product_reviews(rating DESC);
CREATE INDEX idx_reviews_status ON product_reviews(status);
CREATE INDEX idx_reviews_created ON product_reviews(created_at DESC);

-- Composite index for filtering
CREATE INDEX idx_reviews_product_status ON product_reviews(product_id, status, created_at DESC);

-- ============================================
-- 3. PRODUCT WATCHES (WISHLIST) TABLE
-- ============================================
-- Purpose: Track users who are watching/saving products
CREATE TABLE IF NOT EXISTS product_watches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Watch metadata
    notification_enabled BOOLEAN DEFAULT TRUE,
    price_alert_enabled BOOLEAN DEFAULT FALSE,
    price_alert_threshold DECIMAL(15, 2),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(product_id, user_id)
);

-- Indexes for product_watches
CREATE INDEX idx_watches_product_id ON product_watches(product_id);
CREATE INDEX idx_watches_user_id ON product_watches(user_id);
CREATE INDEX idx_watches_created ON product_watches(created_at DESC);

-- ============================================
-- 4. PRODUCT SHARES TABLE
-- ============================================
-- Purpose: Track product shares and generate share analytics
CREATE TABLE IF NOT EXISTS product_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Share details
    share_method TEXT NOT NULL, -- 'link', 'whatsapp', 'email', 'facebook', 'linkedin'
    share_token TEXT UNIQUE NOT NULL, -- Unique token for tracking
    
    -- Engagement tracking
    view_count INTEGER DEFAULT 0,
    click_count INTEGER DEFAULT 0,
    conversion_count INTEGER DEFAULT 0, -- How many shares led to orders
    
    -- Device and location
    device_type TEXT,
    ip_address TEXT,
    city TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_accessed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for product_shares
CREATE INDEX idx_shares_product_id ON product_shares(product_id);
CREATE INDEX idx_shares_user_id ON product_shares(user_id);
CREATE INDEX idx_shares_token ON product_shares(share_token);
CREATE INDEX idx_shares_method ON product_shares(share_method);

-- ============================================
-- 5. SHIPPING OPTIONS TABLE
-- ============================================
-- Purpose: Store shipping methods and logistics details
CREATE TABLE IF NOT EXISTS shipping_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    seller_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Shipping details
    shipping_method TEXT NOT NULL, -- 'standard', 'express', 'local_pickup', 'freight'
    carrier_name TEXT, -- 'Blue Dart', 'DTDC', 'Transport Corp'
    
    -- Pricing
    base_rate DECIMAL(10, 2) NOT NULL,
    per_km_rate DECIMAL(10, 2),
    free_shipping_threshold DECIMAL(15, 2), -- Free shipping above this order value
    
    -- Delivery time
    min_delivery_days INTEGER,
    max_delivery_days INTEGER,
    
    -- Coverage
    serviceable_pincodes TEXT[], -- Array of pincodes
    serviceable_states TEXT[], -- Array of state names
    nationwide BOOLEAN DEFAULT FALSE,
    
    -- Additional info
    insurance_available BOOLEAN DEFAULT FALSE,
    tracking_available BOOLEAN DEFAULT TRUE,
    cod_available BOOLEAN DEFAULT FALSE,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for shipping_options
CREATE INDEX idx_shipping_product_id ON shipping_options(product_id);
CREATE INDEX idx_shipping_seller_id ON shipping_options(seller_id);
CREATE INDEX idx_shipping_method ON shipping_options(shipping_method);
CREATE INDEX idx_shipping_active ON shipping_options(is_active);

-- ============================================
-- 6. QUOTE REQUESTS TABLE
-- ============================================
-- Purpose: Track quote requests from buyers to sellers
CREATE TABLE IF NOT EXISTS quote_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Request details
    quantity INTEGER NOT NULL,
    target_price DECIMAL(15, 2),
    message TEXT NOT NULL,
    
    -- Buyer information
    company_name TEXT,
    gst_number TEXT,
    delivery_pincode TEXT,
    
    -- Quote status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'quoted', 'accepted', 'rejected', 'expired')),
    
    -- Seller response
    quoted_price DECIMAL(15, 2),
    quoted_quantity INTEGER,
    seller_message TEXT,
    validity_days INTEGER,
    quoted_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days')
);

-- Indexes for quote_requests
CREATE INDEX idx_quotes_product_id ON quote_requests(product_id);
CREATE INDEX idx_quotes_buyer_id ON quote_requests(buyer_id);
CREATE INDEX idx_quotes_seller_id ON quote_requests(seller_id);
CREATE INDEX idx_quotes_status ON quote_requests(status);
CREATE INDEX idx_quotes_created ON quote_requests(created_at DESC);

-- ============================================
-- 7. PRODUCT VIEWS TRACKING TABLE
-- ============================================
-- Purpose: Track product page views for analytics
CREATE TABLE IF NOT EXISTS product_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    session_id TEXT,
    
    -- View details
    referrer_url TEXT,
    device_type TEXT,
    ip_address TEXT,
    city TEXT,
    
    -- Engagement
    time_spent_seconds INTEGER,
    scrolled_to_specs BOOLEAN DEFAULT FALSE,
    scrolled_to_reviews BOOLEAN DEFAULT FALSE,
    clicked_seller BOOLEAN DEFAULT FALSE,
    clicked_similar BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for product_views
CREATE INDEX idx_views_product_id ON product_views(product_id);
CREATE INDEX idx_views_user_id ON product_views(user_id);
CREATE INDEX idx_views_viewed_at ON product_views(viewed_at DESC);

-- ============================================
-- TRIGGERS AND FUNCTIONS
-- ============================================

-- Function: Update product rating summary when review is added/updated
CREATE OR REPLACE FUNCTION update_product_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE products
    SET 
        rating = (
            SELECT ROUND(AVG(rating)::numeric, 2)
            FROM product_reviews
            WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)
            AND status = 'approved'
        ),
        review_count = (
            SELECT COUNT(*)
            FROM product_reviews
            WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)
            AND status = 'approved'
        ),
        updated_at = NOW()
    WHERE id = COALESCE(NEW.product_id, OLD.product_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger: Update product rating on review insert/update/delete
DROP TRIGGER IF EXISTS trigger_update_product_rating ON product_reviews;
CREATE TRIGGER trigger_update_product_rating
AFTER INSERT OR UPDATE OF rating, status OR DELETE
ON product_reviews
FOR EACH ROW
EXECUTE FUNCTION update_product_rating();

-- Function: Update product watch count
CREATE OR REPLACE FUNCTION update_watch_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE products
        SET watch_count = watch_count + 1
        WHERE id = NEW.product_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE products
        SET watch_count = GREATEST(watch_count - 1, 0)
        WHERE id = OLD.product_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger: Update watch count on insert/delete
DROP TRIGGER IF EXISTS trigger_update_watch_count ON product_watches;
CREATE TRIGGER trigger_update_watch_count
AFTER INSERT OR DELETE
ON product_watches
FOR EACH ROW
EXECUTE FUNCTION update_watch_count();

-- Function: Increment product views
CREATE OR REPLACE FUNCTION increment_product_views(
    p_product_id UUID
)
RETURNS void AS $$
BEGIN
    UPDATE products
    SET 
        views = views + 1,
        updated_at = NOW()
    WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VIEWS
-- ============================================

-- View: Product detail with aggregated data
CREATE OR REPLACE VIEW v_product_detail AS
SELECT 
    p.*,
    c.name AS category_name,
    c.slug AS category_slug,
    u.business_name AS seller_name,
    u.city AS seller_city,
    u.is_verified AS seller_verified,
    u.gst_verified,
    u.created_at AS seller_since,
    COALESCE(p.rating, 0) AS avg_rating,
    COALESCE(p.review_count, 0) AS total_reviews,
    COALESCE(p.watch_count, 0) AS total_watchers,
    COALESCE(p.views, 0) AS total_views
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN users u ON p.seller_id = u.id;

-- View: Review statistics per product
CREATE OR REPLACE VIEW v_review_stats AS
SELECT 
    product_id,
    COUNT(*) AS total_reviews,
    ROUND(AVG(rating)::numeric, 2) AS avg_rating,
    COUNT(CASE WHEN rating = 5 THEN 1 END) AS rating_5_count,
    COUNT(CASE WHEN rating = 4 THEN 1 END) AS rating_4_count,
    COUNT(CASE WHEN rating = 3 THEN 1 END) AS rating_3_count,
    COUNT(CASE WHEN rating = 2 THEN 1 END) AS rating_2_count,
    COUNT(CASE WHEN rating = 1 THEN 1 END) AS rating_1_count,
    COUNT(CASE WHEN verified_purchase THEN 1 END) AS verified_purchases
FROM product_reviews
WHERE status = 'approved'
GROUP BY product_id;

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE product_specifications IS 'Detailed technical specifications for products';
COMMENT ON TABLE product_reviews IS 'Customer reviews and ratings with moderation';
COMMENT ON TABLE product_watches IS 'User wishlist/watchlist for products with price alerts';
COMMENT ON TABLE product_shares IS 'Track product shares across different platforms';
COMMENT ON TABLE shipping_options IS 'Shipping methods and logistics information per product/seller';
COMMENT ON TABLE quote_requests IS 'B2B quote requests from buyers to sellers';
COMMENT ON TABLE product_views IS 'Track product page views and engagement metrics';

-- ============================================
-- SEED DATA
-- ============================================

-- Add watch_count and review_count columns to products if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'products' AND column_name = 'watch_count') THEN
        ALTER TABLE products ADD COLUMN watch_count INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'products' AND column_name = 'review_count') THEN
        ALTER TABLE products ADD COLUMN review_count INTEGER DEFAULT 0;
    END IF;
END $$;
