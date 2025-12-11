-- =====================================================
-- ZEEROSTOCK HOMEPAGE - SAMPLE SEED DATA
-- Run after homepage-schema.sql
-- =====================================================

-- Initialize today's market stats
INSERT INTO market_stats (
    stat_date,
    total_users,
    active_users_today,
    new_signups_today,
    total_transaction_volume,
    transactions_today,
    volume_today,
    total_listings,
    active_listings,
    new_listings_today,
    total_auctions,
    live_auctions,
    auctions_today,
    success_rate,
    average_deal_size,
    market_heat_index,
    demand_supply_ratio
) VALUES (
    CURRENT_DATE,
    12547,  -- 10K+ users
    1256,
    89,
    52750000,  -- $50M+ volume
    134,
    2850000,
    3847,
    1923,
    167,
    423,
    78,
    12,
    94.5,  -- 95% success rate
    125000,
    78.5,
    1.3
) ON CONFLICT (stat_date) DO UPDATE SET
    total_users = EXCLUDED.total_users,
    total_transaction_volume = EXCLUDED.total_transaction_volume,
    success_rate = EXCLUDED.success_rate;

-- =====================================================
-- CATEGORIES WITH TRENDING DATA
-- =====================================================

INSERT INTO categories (name, slug, description, image_url, listing_count, growth_percentage, is_trending, display_order, is_active) VALUES
('Industrial Machinery', 'industrial-machinery', 'Heavy machinery and equipment for manufacturing', 'https://images.unsplash.com/photo-1565515636590-9aa0ea87a11a?w=400', 487, 15.3, true, 1, true),
('Electronics & Components', 'electronics-components', 'Electronic parts, components and semiconductors', 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400', 623, 22.7, true, 2, true),
('Automotive Parts', 'automotive-parts', 'Vehicle components and accessories', 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=400', 534, 18.2, true, 3, true),
('Building Materials', 'building-materials', 'Construction materials and supplies', 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=400', 398, 12.5, true, 4, true),
('Office Equipment', 'office-equipment', 'Office furniture, computers and supplies', 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400', 289, 8.9, true, 5, true),
('Medical Equipment', 'medical-equipment', 'Healthcare and laboratory equipment', 'https://images.unsplash.com/photo-1581595220975-119360b4d7d7?w=400', 156, 25.4, true, 6, true),
('Food Processing', 'food-processing', 'Industrial food processing machinery', 'https://images.unsplash.com/photo-1556909212-d5b604d0c90d?w=400', 124, 14.6, true, 7, true),
('Packaging Materials', 'packaging-materials', 'Packaging supplies and equipment', 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=400', 267, 11.3, true, 8, true),
('Textile Machinery', 'textile-machinery', 'Textile and garment manufacturing equipment', 'https://images.unsplash.com/photo-1558769132-cb1aea525c80?w=400', 198, 9.8, false, 9, true),
('Lab Equipment', 'lab-equipment', 'Scientific and laboratory instruments', 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=400', 145, 19.2, false, 10, true)
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- CATEGORY INSIGHTS (Trend Data)
-- =====================================================

INSERT INTO category_insights (category_id, insight_date, demand_score, trend_direction, active_listings, new_listings_today, total_views, total_inquiries, average_price, price_trend)
SELECT 
    id,
    CURRENT_DATE,
    CASE 
        WHEN name = 'Medical Equipment' THEN 92.5
        WHEN name = 'Electronics & Components' THEN 88.3
        WHEN name = 'Automotive Parts' THEN 85.7
        WHEN name = 'Industrial Machinery' THEN 82.4
        WHEN name = 'Building Materials' THEN 78.9
        WHEN name = 'Lab Equipment' THEN 75.2
        WHEN name = 'Food Processing' THEN 71.8
        WHEN name = 'Packaging Materials' THEN 68.5
        WHEN name = 'Office Equipment' THEN 65.3
        ELSE 60.0
    END as demand_score,
    CASE 
        WHEN growth_percentage > 15 THEN 'up'
        WHEN growth_percentage < 5 THEN 'stable'
        ELSE 'up'
    END as trend_direction,
    listing_count as active_listings,
    FLOOR(RANDOM() * 20 + 5) as new_listings_today,
    FLOOR(RANDOM() * 5000 + 1000) as total_views,
    FLOOR(RANDOM() * 200 + 50) as total_inquiries,
    FLOOR(RANDOM() * 500000 + 50000) as average_price,
    growth_percentage as price_trend
FROM categories
WHERE is_active = true
ON CONFLICT (category_id, insight_date) DO UPDATE SET
    demand_score = EXCLUDED.demand_score,
    trend_direction = EXCLUDED.trend_direction;

-- =====================================================
-- HERO BANNERS
-- =====================================================

INSERT INTO hero_banners (title, subtitle, image_url, mobile_image_url, cta_text, cta_url, cta_type, banner_type, display_order, is_active) VALUES
('Find Industrial Surplus at Unbeatable Prices', 'Connect with verified suppliers. Save up to 70% on quality equipment.', 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1920', 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=768', 'Browse Deals', '/deals', 'category', 'carousel', 1, true),
('Live Auctions - Bid on Premium Equipment', '78 active auctions ending soon. Don''t miss out on exclusive deals.', 'https://images.unsplash.com/photo-1565515636590-9aa0ea87a11a?w=1920', 'https://images.unsplash.com/photo-1565515636590-9aa0ea87a11a?w=768', 'View Auctions', '/auctions', 'external', 'carousel', 2, true),
('Trusted by 10,000+ Businesses Nationwide', 'Join India''s largest B2B industrial surplus marketplace.', 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1920', 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=768', 'Get Started', '/signup', 'external', 'carousel', 3, true),
('Medical Equipment Sale - Up to 65% Off', 'Certified healthcare equipment from verified suppliers.', 'https://images.unsplash.com/photo-1581595220975-119360b4d7d7?w=1920', 'https://images.unsplash.com/photo-1581595220975-119360b4d7d7?w=768', 'Shop Medical', '/category/medical-equipment', 'category', 'carousel', 4, true);

-- =====================================================
-- TESTIMONIALS
-- =====================================================

INSERT INTO testimonials (user_name, designation, company_name, quote, rating, profile_image_url, company_logo_url, industry, deal_size, is_featured, display_order, is_verified, is_active) VALUES
('Rajesh Kumar', 'Procurement Manager', 'Tata Steel', 'Zeerostock helped us save ₹2.5 crores on surplus machinery. The platform is transparent, and supplier verification gives us confidence.', 5.0, 'https://i.pravatar.cc/150?img=12', null, 'Manufacturing', '₹2.5 Cr', true, 1, true, true),
('Priya Sharma', 'Operations Director', 'Apollo Hospitals', 'Found certified medical equipment at 60% below market price. Quick delivery and excellent supplier support.', 5.0, 'https://i.pravatar.cc/150?img=45', null, 'Healthcare', '₹85 Lakhs', true, 2, true, true),
('Amit Patel', 'Supply Chain Head', 'Mahindra & Mahindra', 'The auction feature is game-changing. We acquired industrial robots worth ₹1.2 crores at 45% discount.', 4.8, 'https://i.pravatar.cc/150?img=33', null, 'Automotive', '₹1.2 Cr', true, 3, true, true),
('Sneha Reddy', 'Purchase Manager', 'Infosys', 'Sold our surplus IT equipment quickly. Platform connects you with serious buyers instantly.', 4.9, 'https://i.pravatar.cc/150?img=23', null, 'IT Services', '₹45 Lakhs', true, 4, true, true),
('Vikram Singh', 'General Manager', 'Reliance Industries', 'Best B2B marketplace for industrial surplus. Verified suppliers, secure transactions, great prices.', 5.0, 'https://i.pravatar.cc/150?img=68', null, 'Petrochemicals', '₹3.8 Cr', true, 5, true, true),
('Anjali Mehta', 'CFO', 'Asian Paints', 'Recovered ₹1.5 crores from idle assets. The process was seamless and professional.', 4.7, 'https://i.pravatar.cc/150?img=16', null, 'Chemicals', '₹1.5 Cr', true, 6, true, true);

-- =====================================================
-- CASE STUDIES
-- =====================================================

INSERT INTO case_studies (company_name, industry, amount_recovered, amount_saved, savings_percent, roi_percent, title, summary, challenge, solution, results, success_highlights, featured_image_url, full_case_study_url, is_featured, display_order, published_date, tags, is_active) VALUES
('Larsen & Toubro', 'Construction', 28500000, null, null, 340, 'How L&T Recovered ₹2.85 Crores from Idle Construction Equipment', 'Leading construction firm monetized surplus machinery across 12 project sites nationwide.', 'L&T had heavy equipment sitting idle across multiple sites after project completion, incurring storage and maintenance costs.', 'Listed equipment on Zeerostock with detailed specs and images. Platform''s nationwide reach connected them with 50+ verified buyers.', 'Sold equipment worth ₹2.85 crores in 45 days. Eliminated storage costs of ₹8 lakhs/month.', '["₹2.85 Cr recovered", "45-day turnaround", "50+ verified buyers", "Zero storage costs"]', 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800', null, true, 1, '2024-11-15', '["construction", "heavy-equipment", "case-study"]', true),
('Apollo Hospitals', 'Healthcare', null, 45000000, 62, 520, 'Apollo Hospitals Saves 62% on Medical Equipment Procurement', 'Multi-specialty hospital chain acquired certified medical devices at significant discount.', 'Budget constraints while expanding 8 new facilities. New equipment quotes exceeded ₹7 crores.', 'Sourced certified surplus medical equipment through Zeerostock''s verified healthcare suppliers.', 'Procured equipment worth ₹7.2 crores for just ₹2.7 crores. All devices certified and warranty-backed.', '["62% cost savings", "₹4.5 Cr saved", "Certified equipment", "8 facilities equipped"]', 'https://images.unsplash.com/photo-1581595220975-119360b4d7d7?w=800', null, true, 2, '2024-10-28', '["healthcare", "medical-equipment", "cost-savings"]', true),
('Mahindra Automotive', 'Automotive', 15200000, null, null, 285, 'Mahindra Recovers ₹1.52 Crores from Production Line Upgrade', 'Major automotive manufacturer liquidated legacy assembly line equipment.', 'Plant modernization left functional but outdated machinery unused. Traditional liquidators offered 30% of asset value.', 'Zeerostock''s auction platform attracted international buyers. Competitive bidding drove prices up.', 'Achieved 85% recovery rate. Equipment shipped to 3 countries. Zero environmental disposal costs.', '["₹1.52 Cr recovered", "85% asset recovery", "Global buyers", "Eco-friendly disposal"]', 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800', null, true, 3, '2024-09-12', '["automotive", "manufacturing", "auction"]', true),
('Asian Paints', 'Chemicals', 19800000, null, null, 412, 'Asian Paints Monetizes Surplus Chemical Processing Units', 'Leading paint manufacturer sold excess production equipment after capacity optimization.', 'Merged two facilities into one, creating surplus of chemical mixers, tanks, and processing units.', 'Listed on Zeerostock with detailed technical specifications. Platform matched them with chemical industry buyers.', 'Sold 23 units worth ₹1.98 crores in 60 days. Cleared warehouse space saving ₹12 lakhs/year.', '["₹1.98 Cr recovered", "23 units sold", "60-day clearance", "Space optimization"]', 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800', null, true, 4, '2024-08-20', '["chemicals", "industrial", "surplus"]', true);

-- =====================================================
-- SAMPLE PRODUCTS (Featured Deals)
-- =====================================================

-- Get category IDs for reference
DO $$
DECLARE
    cat_machinery UUID;
    cat_electronics UUID;
    cat_automotive UUID;
    cat_medical UUID;
    cat_office UUID;
    user_supplier UUID;
BEGIN
    SELECT id INTO cat_machinery FROM categories WHERE slug = 'industrial-machinery' LIMIT 1;
    SELECT id INTO cat_electronics FROM categories WHERE slug = 'electronics-components' LIMIT 1;
    SELECT id INTO cat_automotive FROM categories WHERE slug = 'automotive-parts' LIMIT 1;
    SELECT id INTO cat_medical FROM categories WHERE slug = 'medical-equipment' LIMIT 1;
    SELECT id INTO cat_office FROM categories WHERE slug = 'office-equipment' LIMIT 1;
    
    -- Get a supplier user ID (using any verified user, or create test supplier)
    SELECT id INTO user_supplier FROM users WHERE role = 'supplier' AND is_verified = true LIMIT 1;
    
    IF user_supplier IS NULL THEN
        -- Create test supplier if none exists
        INSERT INTO users (first_name, last_name, company_name, business_email, mobile, password_hash, role, is_verified, business_type)
        VALUES ('Test', 'Supplier', 'Industrial Surplus Co', 'supplier@zeerostock.com', '9876543210', '$2b$12$dummy', 'supplier', true, 'wholesaler')
        RETURNING id INTO user_supplier;
    END IF;

    -- Insert featured products
    INSERT INTO products (title, slug, description, category_id, supplier_id, price_before, price_after, discount_percent, image_url, condition, quantity, unit, city, state, views_count, watchers_count, is_featured, is_trending, listing_type, status, expires_at) VALUES
    ('CNC Lathe Machine - Haas ST-20Y', 'cnc-lathe-machine-haas-st20y', 'High-precision CNC lathe with Y-axis, low hours, excellent condition', cat_machinery, user_supplier, 3500000, 1750000, 50, 'https://images.unsplash.com/photo-1565515636590-9aa0ea87a11a?w=600', 'used', 1, 'unit', 'Pune', 'Maharashtra', 1247, 89, true, true, 'direct_sale', 'active', CURRENT_TIMESTAMP + INTERVAL '15 days'),
    ('Industrial 3-Phase Generator - 500 KVA', 'industrial-generator-500kva', 'Cummins diesel generator, 2020 model, only 800 running hours', cat_machinery, user_supplier, 2800000, 1680000, 43, 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600', 'used', 1, 'unit', 'Chennai', 'Tamil Nadu', 892, 67, true, true, 'direct_sale', 'active', CURRENT_TIMESTAMP + INTERVAL '10 days'),
    ('Semiconductor Wafers - 200mm Silicon', 'semiconductor-wafers-200mm', 'Prime grade silicon wafers, box of 25 units, sealed packaging', cat_electronics, user_supplier, 450000, 225000, 50, 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600', 'new', 25, 'pieces', 'Bangalore', 'Karnataka', 2134, 156, true, true, 'direct_sale', 'active', CURRENT_TIMESTAMP + INTERVAL '7 days'),
    ('Automotive Paint Spray Booth', 'automotive-paint-spray-booth', 'Professional spray booth with filtration system, 2019 model', cat_automotive, user_supplier, 1200000, 720000, 40, 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=600', 'used', 1, 'unit', 'Gurgaon', 'Haryana', 678, 45, true, false, 'direct_sale', 'active', CURRENT_TIMESTAMP + INTERVAL '12 days'),
    ('Digital X-Ray Machine - Philips', 'digital-xray-machine-philips', 'Hospital-grade digital X-ray system, certified and calibrated', cat_medical, user_supplier, 4500000, 1575000, 65, 'https://images.unsplash.com/photo-1581595220975-119360b4d7d7?w=600', 'refurbished', 1, 'unit', 'Mumbai', 'Maharashtra', 1523, 198, true, true, 'direct_sale', 'active', CURRENT_TIMESTAMP + INTERVAL '5 days'),
    ('ICU Patient Monitors - Set of 10', 'icu-patient-monitors-set', 'Multi-parameter monitors with ECG, SpO2, NIBP, certified', cat_medical, user_supplier, 2500000, 1000000, 60, 'https://images.unsplash.com/photo-1584982751601-97dcc096659c?w=600', 'refurbished', 10, 'units', 'Delhi', 'Delhi', 2890, 234, true, true, 'direct_sale', 'active', CURRENT_TIMESTAMP + INTERVAL '8 days'),
    ('Herman Miller Aeron Chairs - Bulk Lot', 'herman-miller-aeron-chairs-bulk', '50 premium ergonomic office chairs, excellent condition', cat_office, user_supplier, 750000, 375000, 50, 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600', 'used', 50, 'pieces', 'Bangalore', 'Karnataka', 1456, 123, true, false, 'direct_sale', 'active', CURRENT_TIMESTAMP + INTERVAL '20 days'),
    ('Dell Latitude Laptops - Corporate Surplus', 'dell-latitude-laptops-corporate', 'i5 8th Gen, 16GB RAM, 512GB SSD, Grade A refurbished', cat_electronics, user_supplier, 4500000, 2700000, 40, 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600', 'refurbished', 100, 'pieces', 'Hyderabad', 'Telangana', 3421, 312, true, true, 'direct_sale', 'active', CURRENT_TIMESTAMP + INTERVAL '6 days');

END $$;

-- =====================================================
-- SAMPLE AUCTIONS
-- =====================================================

DO $$
DECLARE
    product_record RECORD;
BEGIN
    -- Create auctions for some featured products
    FOR product_record IN 
        SELECT id FROM products WHERE is_featured = true LIMIT 3
    LOOP
        INSERT INTO auctions (product_id, starting_bid, current_bid, reserve_price, bid_increment, start_time, end_time, total_bids, total_bidders, status)
        VALUES (
            product_record.id,
            FLOOR(RANDOM() * 1000000 + 500000),
            FLOOR(RANDOM() * 1500000 + 800000),
            FLOOR(RANDOM() * 2000000 + 1000000),
            50000,
            CURRENT_TIMESTAMP - INTERVAL '2 days',
            CURRENT_TIMESTAMP + INTERVAL '3 days',
            FLOOR(RANDOM() * 30 + 5),
            FLOOR(RANDOM() * 15 + 3),
            'live'
        );
    END LOOP;
END $$;

-- =====================================================
-- SUPPLIER TRUST SCORES
-- =====================================================

DO $$
DECLARE
    user_record RECORD;
BEGIN
    FOR user_record IN 
        SELECT id FROM users WHERE role = 'supplier' AND is_verified = true
    LOOP
        INSERT INTO supplier_trust_scores (supplier_id, trust_score, total_transactions, successful_transactions, average_rating, total_reviews, response_time_hours, response_rate, is_verified, verification_level, badges)
        VALUES (
            user_record.id,
            ROUND((RANDOM() * 1.5 + 3.5)::numeric, 2), -- 3.5 to 5.0
            FLOOR(RANDOM() * 100 + 10),
            FLOOR(RANDOM() * 95 + 8),
            ROUND((RANDOM() * 1 + 4)::numeric, 2), -- 4.0 to 5.0
            FLOOR(RANDOM() * 50 + 5),
            ROUND((RANDOM() * 8 + 2)::numeric, 2), -- 2 to 10 hours
            ROUND((RANDOM() * 15 + 85)::numeric, 2), -- 85% to 100%
            true,
            CASE 
                WHEN RANDOM() > 0.7 THEN 'premium'
                WHEN RANDOM() > 0.4 THEN 'standard'
                ELSE 'basic'
            END,
            '["verified-supplier", "fast-responder"]'::jsonb
        )
        ON CONFLICT (supplier_id) DO NOTHING;
    END LOOP;
END $$;

COMMIT;

-- Verify data
SELECT 'Categories:', COUNT(*) FROM categories WHERE is_active = true;
SELECT 'Products:', COUNT(*) FROM products WHERE status = 'active';
SELECT 'Auctions:', COUNT(*) FROM auctions WHERE status = 'live';
SELECT 'Testimonials:', COUNT(*) FROM testimonials WHERE is_active = true;
SELECT 'Case Studies:', COUNT(*) FROM case_studies WHERE is_active = true;
SELECT 'Hero Banners:', COUNT(*) FROM hero_banners WHERE is_active = true;
