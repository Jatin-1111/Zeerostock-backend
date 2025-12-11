-- =====================================================
-- ZEEROSTOCK B2B MARKETPLACE - HOMEPAGE SCHEMA
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. CATEGORIES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    image_url TEXT,
    parent_category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    listing_count INTEGER DEFAULT 0,
    growth_percentage DECIMAL(5,2) DEFAULT 0.00,
    is_trending BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_categories_trending ON categories(is_trending, display_order) WHERE is_active = true;
CREATE INDEX idx_categories_parent ON categories(parent_category_id);
CREATE INDEX idx_categories_slug ON categories(slug);

-- =====================================================
-- 2. PRODUCTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500) NOT NULL,
    slug VARCHAR(500) NOT NULL UNIQUE,
    description TEXT,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Pricing
    price_before DECIMAL(15,2),
    price_after DECIMAL(15,2) NOT NULL,
    discount_percent DECIMAL(5,2) DEFAULT 0.00,
    
    -- Product details
    image_url TEXT,
    gallery_images JSONB DEFAULT '[]',
    condition VARCHAR(50) CHECK (condition IN ('new', 'used', 'refurbished', 'surplus')),
    quantity INTEGER DEFAULT 1,
    unit VARCHAR(50),
    
    -- Location
    city VARCHAR(255),
    state VARCHAR(255),
    country VARCHAR(100) DEFAULT 'India',
    
    -- Engagement metrics
    views_count INTEGER DEFAULT 0,
    watchers_count INTEGER DEFAULT 0,
    inquiries_count INTEGER DEFAULT 0,
    
    -- Status
    is_featured BOOLEAN DEFAULT false,
    is_trending BOOLEAN DEFAULT false,
    listing_type VARCHAR(50) CHECK (listing_type IN ('direct_sale', 'auction', 'rfq')) DEFAULT 'direct_sale',
    status VARCHAR(50) CHECK (status IN ('active', 'sold', 'expired', 'draft')) DEFAULT 'active',
    
    -- Timestamps
    listed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_supplier ON products(supplier_id);
CREATE INDEX idx_products_featured ON products(is_featured, status) WHERE status = 'active';
CREATE INDEX idx_products_trending ON products(is_trending, views_count DESC) WHERE status = 'active';
CREATE INDEX idx_products_status ON products(status, listed_at DESC);
CREATE INDEX idx_products_city ON products(city);

-- =====================================================
-- 3. AUCTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS auctions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    
    -- Auction details
    starting_bid DECIMAL(15,2) NOT NULL,
    current_bid DECIMAL(15,2),
    reserve_price DECIMAL(15,2),
    bid_increment DECIMAL(15,2) DEFAULT 1000.00,
    
    -- Timing
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Engagement
    total_bids INTEGER DEFAULT 0,
    total_bidders INTEGER DEFAULT 0,
    
    -- Status
    status VARCHAR(50) CHECK (status IN ('upcoming', 'live', 'ended', 'cancelled')) DEFAULT 'upcoming',
    winner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_auctions_product ON auctions(product_id);
CREATE INDEX idx_auctions_status ON auctions(status, end_time);
CREATE INDEX idx_auctions_live ON auctions(status, end_time DESC) WHERE status = 'live';
CREATE INDEX idx_auctions_timing ON auctions(start_time, end_time);

-- =====================================================
-- 4. HERO BANNERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS hero_banners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500) NOT NULL,
    subtitle TEXT,
    image_url TEXT NOT NULL,
    mobile_image_url TEXT,
    
    -- Call to Action
    cta_text VARCHAR(255),
    cta_url TEXT,
    cta_type VARCHAR(50) CHECK (cta_type IN ('link', 'category', 'product', 'external')),
    
    -- Banner settings
    banner_type VARCHAR(50) CHECK (banner_type IN ('carousel', 'static', 'video')) DEFAULT 'carousel',
    background_color VARCHAR(50),
    text_color VARCHAR(50),
    
    -- Display settings
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    
    -- Targeting
    target_audience JSONB DEFAULT '{}',
    
    -- Analytics
    impressions_count INTEGER DEFAULT 0,
    clicks_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_hero_banners_active ON hero_banners(is_active, display_order) 
    WHERE is_active = true;
CREATE INDEX idx_hero_banners_dates ON hero_banners(start_date, end_date);

-- =====================================================
-- 5. TESTIMONIALS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS testimonials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_name VARCHAR(255) NOT NULL,
    designation VARCHAR(255),
    company_name VARCHAR(255) NOT NULL,
    
    -- Content
    quote TEXT NOT NULL,
    rating DECIMAL(2,1) CHECK (rating >= 1.0 AND rating <= 5.0),
    
    -- Media
    profile_image_url TEXT,
    company_logo_url TEXT,
    
    -- Metadata
    industry VARCHAR(255),
    deal_size VARCHAR(100),
    
    -- Display
    is_featured BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    
    -- Verification
    is_verified BOOLEAN DEFAULT false,
    verified_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_testimonials_active ON testimonials(is_active, display_order) 
    WHERE is_active = true;
CREATE INDEX idx_testimonials_featured ON testimonials(is_featured, rating DESC) 
    WHERE is_active = true AND is_featured = true;

-- =====================================================
-- 6. CASE STUDIES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS case_studies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name VARCHAR(255) NOT NULL,
    industry VARCHAR(255) NOT NULL,
    
    -- Results
    amount_recovered DECIMAL(15,2),
    amount_saved DECIMAL(15,2),
    savings_percent DECIMAL(5,2),
    roi_percent DECIMAL(5,2),
    
    -- Content
    title VARCHAR(500) NOT NULL,
    summary TEXT NOT NULL,
    challenge TEXT,
    solution TEXT,
    results TEXT,
    success_highlights JSONB DEFAULT '[]',
    
    -- Media
    featured_image_url TEXT,
    gallery_images JSONB DEFAULT '[]',
    
    -- Links
    full_case_study_url TEXT,
    video_url TEXT,
    
    -- Display
    is_featured BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    
    -- Metadata
    tags JSONB DEFAULT '[]',
    published_date DATE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_case_studies_active ON case_studies(is_active, display_order) 
    WHERE is_active = true;
CREATE INDEX idx_case_studies_featured ON case_studies(is_featured, published_date DESC) 
    WHERE is_active = true AND is_featured = true;
CREATE INDEX idx_case_studies_industry ON case_studies(industry);

-- =====================================================
-- 7. MARKET STATS TABLE (Real-time aggregated data)
-- =====================================================
CREATE TABLE IF NOT EXISTS market_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stat_date DATE NOT NULL UNIQUE DEFAULT CURRENT_DATE,
    
    -- User stats
    total_users INTEGER DEFAULT 0,
    active_users_today INTEGER DEFAULT 0,
    new_signups_today INTEGER DEFAULT 0,
    
    -- Transaction stats
    total_transaction_volume DECIMAL(20,2) DEFAULT 0.00,
    transactions_today INTEGER DEFAULT 0,
    volume_today DECIMAL(15,2) DEFAULT 0.00,
    
    -- Listing stats
    total_listings INTEGER DEFAULT 0,
    active_listings INTEGER DEFAULT 0,
    new_listings_today INTEGER DEFAULT 0,
    
    -- Auction stats
    total_auctions INTEGER DEFAULT 0,
    live_auctions INTEGER DEFAULT 0,
    auctions_today INTEGER DEFAULT 0,
    
    -- Success metrics
    success_rate DECIMAL(5,2) DEFAULT 0.00,
    average_deal_size DECIMAL(15,2) DEFAULT 0.00,
    
    -- Market health
    market_heat_index DECIMAL(5,2) DEFAULT 50.00,
    demand_supply_ratio DECIMAL(5,2) DEFAULT 1.00,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_market_stats_date ON market_stats(stat_date DESC);

-- =====================================================
-- 8. CATEGORY INSIGHTS TABLE (Trend data per category)
-- =====================================================
CREATE TABLE IF NOT EXISTS category_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    insight_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Demand metrics
    demand_score DECIMAL(5,2) DEFAULT 0.00,
    trend_direction VARCHAR(20) CHECK (trend_direction IN ('up', 'down', 'stable')),
    
    -- Activity
    active_listings INTEGER DEFAULT 0,
    new_listings_today INTEGER DEFAULT 0,
    total_views INTEGER DEFAULT 0,
    total_inquiries INTEGER DEFAULT 0,
    
    -- Pricing
    average_price DECIMAL(15,2),
    price_trend DECIMAL(5,2),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(category_id, insight_date)
);

CREATE INDEX idx_category_insights_date ON category_insights(insight_date DESC);
CREATE INDEX idx_category_insights_category ON category_insights(category_id, insight_date DESC);
CREATE INDEX idx_category_insights_demand ON category_insights(demand_score DESC, insight_date DESC);

-- =====================================================
-- 9. PRODUCT VIEWS TABLE (Track engagement)
-- =====================================================
CREATE TABLE IF NOT EXISTS product_views (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    session_id VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_product_views_product ON product_views(product_id, viewed_at DESC);
CREATE INDEX idx_product_views_user ON product_views(user_id, viewed_at DESC);
CREATE INDEX idx_product_views_date ON product_views(viewed_at DESC);

-- =====================================================
-- 10. SUPPLIER TRUST SCORES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS supplier_trust_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    
    -- Trust metrics
    trust_score DECIMAL(3,2) CHECK (trust_score >= 0 AND trust_score <= 5.0) DEFAULT 0.00,
    total_transactions INTEGER DEFAULT 0,
    successful_transactions INTEGER DEFAULT 0,
    
    -- Ratings
    average_rating DECIMAL(3,2) DEFAULT 0.00,
    total_reviews INTEGER DEFAULT 0,
    
    -- Response metrics
    response_time_hours DECIMAL(5,2),
    response_rate DECIMAL(5,2),
    
    -- Verification
    is_verified BOOLEAN DEFAULT false,
    verification_level VARCHAR(50) CHECK (verification_level IN ('basic', 'standard', 'premium', 'enterprise')),
    
    -- Badges
    badges JSONB DEFAULT '[]',
    
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_supplier_trust_supplier ON supplier_trust_scores(supplier_id);
CREATE INDEX idx_supplier_trust_score ON supplier_trust_scores(trust_score DESC);

-- =====================================================
-- UPDATE TRIGGERS
-- =====================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_auctions_updated_at BEFORE UPDATE ON auctions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hero_banners_updated_at BEFORE UPDATE ON hero_banners
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_testimonials_updated_at BEFORE UPDATE ON testimonials
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_case_studies_updated_at BEFORE UPDATE ON case_studies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_market_stats_updated_at BEFORE UPDATE ON market_stats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_supplier_trust_scores_updated_at BEFORE UPDATE ON supplier_trust_scores
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ANALYTICS FUNCTIONS
-- =====================================================

-- Function to update product views count
CREATE OR REPLACE FUNCTION increment_product_views()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE products 
    SET views_count = views_count + 1 
    WHERE id = NEW.product_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_increment_product_views
AFTER INSERT ON product_views
FOR EACH ROW EXECUTE FUNCTION increment_product_views();

-- Function to update category listing count
CREATE OR REPLACE FUNCTION update_category_listing_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE categories 
        SET listing_count = listing_count + 1 
        WHERE id = NEW.category_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE categories 
        SET listing_count = GREATEST(listing_count - 1, 0)
        WHERE id = OLD.category_id;
    ELSIF TG_OP = 'UPDATE' AND NEW.category_id != OLD.category_id THEN
        UPDATE categories 
        SET listing_count = GREATEST(listing_count - 1, 0)
        WHERE id = OLD.category_id;
        
        UPDATE categories 
        SET listing_count = listing_count + 1 
        WHERE id = NEW.category_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_category_listing_count
AFTER INSERT OR UPDATE OR DELETE ON products
FOR EACH ROW EXECUTE FUNCTION update_category_listing_count();

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE categories IS 'Product categories with hierarchical structure and trending data';
COMMENT ON TABLE products IS 'Main product listings with pricing, location, and engagement metrics';
COMMENT ON TABLE auctions IS 'Live auction data linked to products';
COMMENT ON TABLE hero_banners IS 'Homepage hero banners and carousel slides';
COMMENT ON TABLE testimonials IS 'Customer testimonials and reviews';
COMMENT ON TABLE case_studies IS 'Success stories and business case studies';
COMMENT ON TABLE market_stats IS 'Daily aggregated marketplace statistics';
COMMENT ON TABLE category_insights IS 'Per-category trend and demand analytics';
COMMENT ON TABLE product_views IS 'Product view tracking for analytics';
COMMENT ON TABLE supplier_trust_scores IS 'Supplier reputation and trust metrics';
