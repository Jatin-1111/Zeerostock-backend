-- Zeerostock Search Schema
-- Tables: search_index, recent_searches, popular_searches, search_analytics
-- Features: Full-text search, fuzzy matching, synonym support, spell correction

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm; -- For trigram similarity (fuzzy matching)
CREATE EXTENSION IF NOT EXISTS btree_gin; -- For composite GIN indexes
CREATE EXTENSION IF NOT EXISTS unaccent; -- For accent-insensitive search

-- ============================================
-- 1. SEARCH INDEX TABLE
-- ============================================
-- Purpose: Optimized search index with keywords, synonyms, and embeddings
-- Performance: Full-text search with trigram fuzzy matching
CREATE TABLE IF NOT EXISTS search_index (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    
    -- Search fields
    keywords TEXT NOT NULL, -- Comma-separated keywords extracted from product
    synonyms TEXT, -- Alternative terms (e.g., "CNC" -> "computer numerical control, machining center")
    normalized_title TEXT NOT NULL, -- Lowercase, unaccented title for matching
    normalized_description TEXT, -- Lowercase, unaccented description
    
    -- Category and brand info
    category_name TEXT,
    industry_name TEXT,
    brand TEXT,
    
    -- Search metadata
    search_count INTEGER DEFAULT 0, -- How many times this product appeared in searches
    click_count INTEGER DEFAULT 0, -- How many times clicked from search results
    ctr DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE WHEN search_count > 0 
        THEN (click_count::DECIMAL / search_count * 100) 
        ELSE 0 END
    ) STORED, -- Click-through rate
    
    -- Full-text search vectors
    title_vector tsvector,
    description_vector tsvector,
    keywords_vector tsvector,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for search_index
CREATE INDEX idx_search_index_product_id ON search_index(product_id);
CREATE INDEX idx_search_index_keywords ON search_index USING GIN(keywords gin_trgm_ops); -- Trigram fuzzy matching
CREATE INDEX idx_search_index_normalized_title ON search_index USING GIN(normalized_title gin_trgm_ops);
CREATE INDEX idx_search_index_category ON search_index(category_name);
CREATE INDEX idx_search_index_industry ON search_index(industry_name);
CREATE INDEX idx_search_index_brand ON search_index(brand);

-- Full-text search indexes
CREATE INDEX idx_search_index_title_vector ON search_index USING GIN(title_vector);
CREATE INDEX idx_search_index_description_vector ON search_index USING GIN(description_vector);
CREATE INDEX idx_search_index_keywords_vector ON search_index USING GIN(keywords_vector);

-- Composite index for ranking
CREATE INDEX idx_search_index_ranking ON search_index(search_count DESC, click_count DESC, ctr DESC);

-- ============================================
-- 2. RECENT SEARCHES TABLE
-- ============================================
-- Purpose: Track user search history (authenticated users only)
-- Features: Auto-delete searches older than 30 days
CREATE TABLE IF NOT EXISTS recent_searches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Search query
    query TEXT NOT NULL,
    normalized_query TEXT NOT NULL, -- Lowercase, trimmed version
    
    -- Search context
    results_count INTEGER DEFAULT 0, -- How many results were returned
    filters_applied JSONB, -- Store applied filters (category, price, etc.)
    
    -- Interaction
    clicked_product_id UUID REFERENCES products(id) ON DELETE SET NULL, -- Which product was clicked
    searched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_user_query_timestamp UNIQUE(user_id, query, searched_at)
);

-- Indexes for recent_searches
CREATE INDEX idx_recent_searches_user_id ON recent_searches(user_id);
CREATE INDEX idx_recent_searches_searched_at ON recent_searches(searched_at DESC);
CREATE INDEX idx_recent_searches_normalized_query ON recent_searches(normalized_query);

-- Auto-delete old searches (30 days)
CREATE INDEX idx_recent_searches_cleanup ON recent_searches(searched_at) 
WHERE searched_at < NOW() - INTERVAL '30 days';

-- ============================================
-- 3. POPULAR SEARCHES TABLE
-- ============================================
-- Purpose: Track trending search terms across all users
-- Features: Daily aggregation, trending score calculation
CREATE TABLE IF NOT EXISTS popular_searches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Search term
    query TEXT NOT NULL UNIQUE,
    normalized_query TEXT NOT NULL UNIQUE,
    
    -- Statistics
    total_searches INTEGER DEFAULT 1, -- All-time search count
    searches_today INTEGER DEFAULT 0, -- Today's search count
    searches_this_week INTEGER DEFAULT 0, -- This week's search count
    searches_this_month INTEGER DEFAULT 0, -- This month's search count
    
    -- Trending metrics
    trending_score DECIMAL(10,2) DEFAULT 0, -- Calculated score for trending
    last_searched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for popular_searches
CREATE INDEX idx_popular_searches_query ON popular_searches(query);
CREATE INDEX idx_popular_searches_normalized_query ON popular_searches(normalized_query);
CREATE INDEX idx_popular_searches_trending ON popular_searches(trending_score DESC, total_searches DESC);
CREATE INDEX idx_popular_searches_total ON popular_searches(total_searches DESC);
CREATE INDEX idx_popular_searches_last_searched ON popular_searches(last_searched_at DESC);

-- ============================================
-- 4. SEARCH ANALYTICS TABLE
-- ============================================
-- Purpose: Track detailed search analytics for insights
-- Features: Click tracking, conversion tracking, A/B testing support
CREATE TABLE IF NOT EXISTS search_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- User info (nullable for anonymous users)
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    session_id TEXT, -- Anonymous session tracking
    
    -- Search query
    query TEXT NOT NULL,
    normalized_query TEXT NOT NULL,
    
    -- Search context
    results_count INTEGER DEFAULT 0,
    filters_applied JSONB, -- Category, price range, condition, etc.
    sort_by TEXT, -- Which sort option was used
    page INTEGER DEFAULT 1, -- Which page of results
    
    -- User interaction
    clicked_product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    click_position INTEGER, -- Position in search results (1-based)
    time_to_click INTEGER, -- Milliseconds from search to click
    
    -- Conversion tracking
    added_to_cart BOOLEAN DEFAULT FALSE,
    converted_to_order BOOLEAN DEFAULT FALSE,
    
    -- Device and location
    device_type TEXT, -- 'mobile', 'tablet', 'desktop'
    user_agent TEXT,
    ip_address TEXT,
    city TEXT,
    
    -- Timestamps
    searched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    clicked_at TIMESTAMP WITH TIME ZONE,
    
    -- Performance metrics
    response_time_ms INTEGER, -- Backend response time
    
    -- A/B testing
    experiment_variant TEXT -- For search algorithm A/B testing
);

-- Indexes for search_analytics
CREATE INDEX idx_search_analytics_user_id ON search_analytics(user_id);
CREATE INDEX idx_search_analytics_session_id ON search_analytics(session_id);
CREATE INDEX idx_search_analytics_query ON search_analytics(normalized_query);
CREATE INDEX idx_search_analytics_searched_at ON search_analytics(searched_at DESC);
CREATE INDEX idx_search_analytics_clicked_product ON search_analytics(clicked_product_id);
CREATE INDEX idx_search_analytics_conversion ON search_analytics(converted_to_order, added_to_cart);

-- Composite index for analytics queries
CREATE INDEX idx_search_analytics_performance ON search_analytics(searched_at DESC, response_time_ms, results_count);

-- ============================================
-- 5. SYNONYM DICTIONARY TABLE
-- ============================================
-- Purpose: Map alternative terms to canonical keywords
-- Example: "CNC" -> "computer numerical control, machining center, milling machine"
CREATE TABLE IF NOT EXISTS search_synonyms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Synonym mapping
    term TEXT NOT NULL UNIQUE, -- Original term
    synonyms TEXT[] NOT NULL, -- Array of alternative terms
    
    -- Category context (optional)
    category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    industry_id UUID REFERENCES industries(id) ON DELETE CASCADE,
    
    -- Usage tracking
    usage_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for search_synonyms
CREATE INDEX idx_search_synonyms_term ON search_synonyms(term);
CREATE INDEX idx_search_synonyms_category ON search_synonyms(category_id);
CREATE INDEX idx_search_synonyms_industry ON search_synonyms(industry_id);

-- ============================================
-- 6. SEARCH SUGGESTIONS TABLE
-- ============================================
-- Purpose: Pre-computed auto-suggestions for common searches
-- Features: Cached suggestions for performance (<120ms requirement)
CREATE TABLE IF NOT EXISTS search_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Suggestion text
    suggestion TEXT NOT NULL UNIQUE,
    normalized_suggestion TEXT NOT NULL,
    
    -- Suggestion metadata
    suggestion_type TEXT NOT NULL, -- 'product', 'category', 'brand', 'keyword'
    related_id UUID, -- ID of related product/category/brand
    
    -- Ranking
    priority INTEGER DEFAULT 0, -- Manual boost for specific suggestions
    popularity_score DECIMAL(10,2) DEFAULT 0, -- Based on search frequency
    
    -- Display info
    thumbnail_url TEXT, -- For product suggestions
    subtitle TEXT, -- Additional context (e.g., "in Electronics")
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for search_suggestions
CREATE INDEX idx_search_suggestions_normalized ON search_suggestions USING GIN(normalized_suggestion gin_trgm_ops);
CREATE INDEX idx_search_suggestions_type ON search_suggestions(suggestion_type);
CREATE INDEX idx_search_suggestions_ranking ON search_suggestions(priority DESC, popularity_score DESC);

-- ============================================
-- TRIGGERS AND FUNCTIONS
-- ============================================

-- Function: Update search_index when product changes
CREATE OR REPLACE FUNCTION update_search_index()
RETURNS TRIGGER AS $$
BEGIN
    -- Update or insert search index entry
    INSERT INTO search_index (
        product_id,
        keywords,
        normalized_title,
        normalized_description,
        category_name,
        brand,
        title_vector,
        description_vector,
        keywords_vector
    )
    VALUES (
        NEW.id,
        LOWER(NEW.title || ' ' || COALESCE(NEW.description, '') || ' ' || COALESCE(NEW.brand, '')),
        LOWER(unaccent(NEW.title)),
        LOWER(unaccent(COALESCE(NEW.description, ''))),
        (SELECT name FROM categories WHERE id = NEW.category_id),
        NEW.brand,
        to_tsvector('english', NEW.title),
        to_tsvector('english', COALESCE(NEW.description, '')),
        to_tsvector('english', LOWER(NEW.title || ' ' || COALESCE(NEW.description, '') || ' ' || COALESCE(NEW.brand, '')))
    )
    ON CONFLICT (product_id) DO UPDATE SET
        keywords = EXCLUDED.keywords,
        normalized_title = EXCLUDED.normalized_title,
        normalized_description = EXCLUDED.normalized_description,
        category_name = EXCLUDED.category_name,
        brand = EXCLUDED.brand,
        title_vector = EXCLUDED.title_vector,
        description_vector = EXCLUDED.description_vector,
        keywords_vector = EXCLUDED.keywords_vector,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Sync search_index with products table
DROP TRIGGER IF EXISTS trigger_update_search_index ON products;
CREATE TRIGGER trigger_update_search_index
AFTER INSERT OR UPDATE OF title, description, brand, category_id
ON products
FOR EACH ROW
EXECUTE FUNCTION update_search_index();

-- Function: Update popular_searches trending score
-- Trending score = (searches_today * 10) + (searches_this_week * 2) + (searches_this_month * 0.5)
CREATE OR REPLACE FUNCTION update_trending_scores()
RETURNS void AS $$
BEGIN
    UPDATE popular_searches
    SET trending_score = (
        (searches_today * 10) + 
        (searches_this_week * 2) + 
        (searches_this_month * 0.5)
    ),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function: Reset daily search counts (run at midnight)
CREATE OR REPLACE FUNCTION reset_daily_search_counts()
RETURNS void AS $$
BEGIN
    UPDATE popular_searches
    SET searches_today = 0,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function: Reset weekly search counts (run on Monday)
CREATE OR REPLACE FUNCTION reset_weekly_search_counts()
RETURNS void AS $$
BEGIN
    UPDATE popular_searches
    SET searches_this_week = 0,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function: Reset monthly search counts (run on 1st of month)
CREATE OR REPLACE FUNCTION reset_monthly_search_counts()
RETURNS void AS $$
BEGIN
    UPDATE popular_searches
    SET searches_this_month = 0,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function: Clean up old recent searches (>30 days)
CREATE OR REPLACE FUNCTION cleanup_old_searches()
RETURNS void AS $$
BEGIN
    DELETE FROM recent_searches
    WHERE searched_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Function: Get fuzzy match suggestions using trigram similarity
CREATE OR REPLACE FUNCTION get_fuzzy_suggestions(
    search_query TEXT,
    similarity_threshold DECIMAL DEFAULT 0.3,
    result_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    suggestion TEXT,
    similarity_score DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ss.suggestion,
        similarity(ss.normalized_suggestion, LOWER(search_query)) AS similarity_score
    FROM search_suggestions ss
    WHERE similarity(ss.normalized_suggestion, LOWER(search_query)) > similarity_threshold
    ORDER BY similarity_score DESC, ss.priority DESC, ss.popularity_score DESC
    LIMIT result_limit;
END;
$$ LANGUAGE plpgsql;

-- Function: Track search event (increment popular_searches)
CREATE OR REPLACE FUNCTION track_search_event(
    search_query TEXT
)
RETURNS void AS $$
DECLARE
    normalized TEXT;
BEGIN
    normalized := LOWER(TRIM(search_query));
    
    INSERT INTO popular_searches (query, normalized_query)
    VALUES (search_query, normalized)
    ON CONFLICT (normalized_query) DO UPDATE SET
        total_searches = popular_searches.total_searches + 1,
        searches_today = popular_searches.searches_today + 1,
        searches_this_week = popular_searches.searches_this_week + 1,
        searches_this_month = popular_searches.searches_this_month + 1,
        last_searched_at = NOW(),
        updated_at = NOW();
    
    -- Update trending scores
    PERFORM update_trending_scores();
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- SEARCH VIEWS
-- ============================================

-- View: Trending searches (top 50 by trending score)
CREATE OR REPLACE VIEW v_trending_searches AS
SELECT 
    query,
    normalized_query,
    total_searches,
    searches_today,
    searches_this_week,
    trending_score,
    last_searched_at
FROM popular_searches
WHERE last_searched_at > NOW() - INTERVAL '7 days' -- Only searches from last week
ORDER BY trending_score DESC, total_searches DESC
LIMIT 50;

-- View: Top searches (all-time)
CREATE OR REPLACE VIEW v_top_searches AS
SELECT 
    query,
    normalized_query,
    total_searches,
    searches_today,
    last_searched_at
FROM popular_searches
ORDER BY total_searches DESC
LIMIT 100;

-- View: Search performance analytics
CREATE OR REPLACE VIEW v_search_performance AS
SELECT 
    DATE(searched_at) AS search_date,
    COUNT(*) AS total_searches,
    COUNT(DISTINCT user_id) AS unique_users,
    COUNT(DISTINCT session_id) AS unique_sessions,
    AVG(results_count) AS avg_results,
    AVG(response_time_ms) AS avg_response_time,
    COUNT(clicked_product_id) AS total_clicks,
    (COUNT(clicked_product_id)::DECIMAL / COUNT(*) * 100) AS overall_ctr,
    COUNT(CASE WHEN added_to_cart THEN 1 END) AS cart_additions,
    COUNT(CASE WHEN converted_to_order THEN 1 END) AS conversions
FROM search_analytics
GROUP BY DATE(searched_at)
ORDER BY search_date DESC;

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE search_index IS 'Optimized search index with full-text search, trigram fuzzy matching, and synonym support';
COMMENT ON TABLE recent_searches IS 'User search history (authenticated users only), auto-deleted after 30 days';
COMMENT ON TABLE popular_searches IS 'Trending and popular search terms with daily/weekly/monthly aggregation';
COMMENT ON TABLE search_analytics IS 'Detailed search analytics for tracking clicks, conversions, and performance';
COMMENT ON TABLE search_synonyms IS 'Synonym dictionary for alternative term mapping (e.g., CNC -> computer numerical control)';
COMMENT ON TABLE search_suggestions IS 'Pre-computed auto-suggestions for fast response (<120ms)';

COMMENT ON COLUMN search_index.keywords IS 'Comma-separated keywords extracted from product title, description, brand';
COMMENT ON COLUMN search_index.ctr IS 'Click-through rate: (click_count / search_count * 100)';
COMMENT ON COLUMN popular_searches.trending_score IS 'Calculated as: (today * 10) + (this_week * 2) + (this_month * 0.5)';
COMMENT ON COLUMN search_analytics.click_position IS 'Position in search results where user clicked (1-based)';
COMMENT ON COLUMN search_analytics.time_to_click IS 'Milliseconds from search to click event';

-- ============================================
-- INITIAL DATA
-- ============================================

-- Common industrial B2B synonyms for Indian market
INSERT INTO search_synonyms (term, synonyms) VALUES
('CNC', ARRAY['computer numerical control', 'machining center', 'milling machine', 'cnc lathe', 'turning center']),
('forklift', ARRAY['lift truck', 'warehouse truck', 'material handling equipment', 'pallet jack', 'stacker']),
('welding', ARRAY['arc welding', 'tig welding', 'mig welding', 'spot welding', 'fabrication']),
('compressor', ARRAY['air compressor', 'industrial compressor', 'screw compressor', 'reciprocating compressor']),
('generator', ARRAY['genset', 'power generator', 'diesel generator', 'backup power', 'dg set']),
('pump', ARRAY['water pump', 'industrial pump', 'centrifugal pump', 'submersible pump', 'monoblock pump']),
('conveyor', ARRAY['belt conveyor', 'material handling', 'conveyor system', 'roller conveyor', 'chain conveyor']),
('crane', ARRAY['overhead crane', 'gantry crane', 'eot crane', 'jib crane', 'lifting equipment']),
('transformer', ARRAY['power transformer', 'distribution transformer', 'isolation transformer', 'step down transformer']),
('motor', ARRAY['electric motor', 'induction motor', 'ac motor', 'dc motor', 'servo motor'])
ON CONFLICT (term) DO NOTHING;

-- Sample search suggestions
INSERT INTO search_suggestions (suggestion, normalized_suggestion, suggestion_type, priority, popularity_score) VALUES
('CNC Machine', 'cnc machine', 'product', 10, 95.5),
('Industrial Compressor', 'industrial compressor', 'product', 9, 88.3),
('Forklift 3 Ton', 'forklift 3 ton', 'product', 8, 82.1),
('Welding Machine', 'welding machine', 'product', 8, 79.8),
('Diesel Generator', 'diesel generator', 'product', 7, 75.4),
('X-Ray Machine', 'x-ray machine', 'product', 7, 72.9),
('Hydraulic Press', 'hydraulic press', 'product', 6, 68.2),
('Lathe Machine', 'lathe machine', 'product', 6, 65.7),
('Pallet Jack', 'pallet jack', 'product', 5, 58.3),
('Electric Motor', 'electric motor', 'product', 5, 55.9)
ON CONFLICT (suggestion) DO NOTHING;

-- ============================================
-- MAINTENANCE NOTES
-- ============================================
-- Run these maintenance tasks periodically:
-- 1. Daily: SELECT reset_daily_search_counts();
-- 2. Weekly: SELECT reset_weekly_search_counts();
-- 3. Monthly: SELECT reset_monthly_search_counts();
-- 4. Daily: SELECT cleanup_old_searches();
-- 5. Hourly: SELECT update_trending_scores();
-- 
-- Performance monitoring:
-- SELECT * FROM v_search_performance ORDER BY search_date DESC LIMIT 30;
-- 
-- Vacuum tables monthly:
-- VACUUM ANALYZE search_index;
-- VACUUM ANALYZE popular_searches;
-- VACUUM ANALYZE search_analytics;
