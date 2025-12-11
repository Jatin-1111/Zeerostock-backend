-- =====================================================
-- Zeerostock Marketplace Seed Data
-- Realistic sample data for testing marketplace APIs
-- =====================================================

-- =====================================================
-- 1. INDUSTRIES DATA
-- =====================================================
INSERT INTO industries (name, slug, description, image_url, product_count, display_order) VALUES
('Manufacturing', 'manufacturing', 'Industrial manufacturing equipment and machinery', 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158', 2500, 1),
('Construction', 'construction', 'Construction equipment, tools, and materials', 'https://images.unsplash.com/photo-1504307651254-35680f356dfd', 1800, 2),
('Automotive', 'automotive', 'Automotive parts, tools, and equipment', 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7', 1200, 3),
('Healthcare & Medical', 'healthcare-medical', 'Medical equipment and healthcare supplies', 'https://images.unsplash.com/photo-1584982751601-97dcc096659c', 950, 4),
('Electronics & IT', 'electronics-it', 'Electronics, computers, and IT infrastructure', 'https://images.unsplash.com/photo-1518770660439-4636190af475', 1600, 5),
('Energy & Power', 'energy-power', 'Power generation and energy equipment', 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e', 850, 6),
('Food & Beverage', 'food-beverage', 'Food processing and beverage equipment', 'https://images.unsplash.com/photo-1504674900247-0877df9cc836', 720, 7),
('Textiles & Apparel', 'textiles-apparel', 'Textile machinery and apparel equipment', 'https://images.unsplash.com/photo-1558769132-cb1aea1f8db7', 680, 8),
('Chemical & Pharmaceutical', 'chemical-pharmaceutical', 'Chemical processing and pharmaceutical equipment', 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69', 540, 9),
('Logistics & Warehousing', 'logistics-warehousing', 'Warehouse equipment and logistics solutions', 'https://images.unsplash.com/photo-1566576721346-d4a3b4eaeb55', 920, 10)
ON CONFLICT (slug) DO NOTHING;

-- =====================================================
-- 2. UPDATE CATEGORIES WITH INDUSTRIES
-- =====================================================
UPDATE categories SET 
    industry_id = (SELECT id FROM industries WHERE slug = 'manufacturing' LIMIT 1),
    product_count = 156,
    is_featured = true
WHERE name = 'Industrial Machinery';

UPDATE categories SET 
    industry_id = (SELECT id FROM industries WHERE slug = 'electronics-it' LIMIT 1),
    product_count = 234,
    is_featured = true
WHERE name = 'Electronics';

UPDATE categories SET 
    industry_id = (SELECT id FROM industries WHERE slug = 'automotive' LIMIT 1),
    product_count = 189
WHERE name = 'Automotive';

UPDATE categories SET 
    industry_id = (SELECT id FROM industries WHERE slug = 'healthcare-medical' LIMIT 1),
    product_count = 98,
    is_featured = true
WHERE name = 'Medical Equipment';

-- =====================================================
-- 3. ENHANCED PRODUCTS DATA (Marketplace-Ready)
-- =====================================================

-- Get IDs for foreign keys
DO $$
DECLARE
    manufacturing_id UUID;
    construction_id UUID;
    automotive_id UUID;
    healthcare_id UUID;
    electronics_id UUID;
    machinery_cat UUID;
    electronics_cat UUID;
    automotive_cat UUID;
    medical_cat UUID;
    supplier_id UUID;
BEGIN
    -- Get industry IDs
    SELECT id INTO manufacturing_id FROM industries WHERE slug = 'manufacturing' LIMIT 1;
    SELECT id INTO construction_id FROM industries WHERE slug = 'construction' LIMIT 1;
    SELECT id INTO automotive_id FROM industries WHERE slug = 'automotive' LIMIT 1;
    SELECT id INTO healthcare_id FROM industries WHERE slug = 'healthcare-medical' LIMIT 1;
    SELECT id INTO electronics_id FROM industries WHERE slug = 'electronics-it' LIMIT 1;

    -- Get category IDs
    SELECT id INTO machinery_cat FROM categories WHERE name = 'Industrial Machinery' LIMIT 1;
    SELECT id INTO electronics_cat FROM categories WHERE name = 'Electronics' LIMIT 1;
    SELECT id INTO automotive_cat FROM categories WHERE name = 'Automotive' LIMIT 1;
    SELECT id INTO medical_cat FROM categories WHERE name = 'Medical Equipment' LIMIT 1;

    -- Get a supplier ID (use first available or create test supplier)
    SELECT id INTO supplier_id FROM users WHERE role = 'supplier' LIMIT 1;
    
    IF supplier_id IS NULL THEN
        -- Create a test supplier if none exists
        INSERT INTO users (
            email, password, first_name, last_name, mobile, role, 
            is_verified, is_email_verified, is_mobile_verified, business_name
        ) VALUES (
            'supplier@zeerostock.com', 
            '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY.dOvqvV6ELq0i',
            'Demo', 'Supplier', '+919876543210', 'supplier',
            true, true, true, 'Demo Surplus Traders'
        ) RETURNING id INTO supplier_id;
    END IF;

    -- Insert marketplace products
    INSERT INTO products (
        title, slug, description, category_id, industry_id, supplier_id,
        image_url, price_before, price_after, discount_percent,
        city, state, condition, listing_type, status,
        rating, review_count, views_count, watchers_count,
        available_quantity, min_order_quantity, supplier_verified,
        is_sponsored, is_featured, is_trending, sponsored_priority, featured_priority,
        expires_at, listed_at
    ) VALUES
    -- Sponsored Listings
    ('CNC Milling Machine - HAAS VF-2', 'cnc-milling-machine-haas-vf-2', 
     'High-precision CNC milling machine, 5-axis, excellent condition. Recently serviced.', 
     machinery_cat, manufacturing_id, supplier_id,
     'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261', 
     2500000, 1625000, 35,
     'Mumbai', 'Maharashtra', 'like-new', 'auction', 'active',
     4.8, 12, 245, 34, 1, 1, true,
     true, true, true, 100, 100,
     CURRENT_TIMESTAMP + INTERVAL '5 days', CURRENT_TIMESTAMP - INTERVAL '2 days'),

    ('Industrial Lathe Machine - 500mm', 'industrial-lathe-machine-500mm',
     'Heavy-duty lathe machine with digital readout. Perfect for metal fabrication.', 
     machinery_cat, manufacturing_id, supplier_id,
     'https://images.unsplash.com/photo-1581092160562-40aa08e78837', 
     1800000, 1260000, 30,
     'Pune', 'Maharashtra', 'good', 'fixed', 'active',
     4.5, 8, 189, 28, 1, 1, true,
     true, true, false, 90, 95,
     NULL, CURRENT_TIMESTAMP - INTERVAL '1 day'),

    ('Hydraulic Press Machine - 200 Ton', 'hydraulic-press-machine-200-ton',
     '200-ton hydraulic press, ideal for sheet metal work. Fully functional.', 
     machinery_cat, manufacturing_id, supplier_id,
     'https://images.unsplash.com/photo-1581093458791-9f3c3250a8e0', 
     950000, 665000, 30,
     'Bangalore', 'Karnataka', 'good', 'negotiable', 'active',
     4.6, 15, 298, 42, 1, 1, true,
     true, true, true, 85, 90,
     NULL, CURRENT_TIMESTAMP - INTERVAL '3 days'),

    -- Featured Deals
    ('X-Ray Machine - Siemens Multix', 'x-ray-machine-siemens-multix',
     'Digital X-ray system with full accessories. Hospital surplus.', 
     medical_cat, healthcare_id, supplier_id,
     'https://images.unsplash.com/photo-1516549655169-df83a0774514', 
     3200000, 1920000, 40,
     'Chennai', 'Tamil Nadu', 'like-new', 'fixed', 'active',
     4.9, 6, 156, 19, 1, 1, true,
     false, true, false, 0, 85,
     NULL, CURRENT_TIMESTAMP - INTERVAL '4 days'),

    ('Dell PowerEdge R740 Server', 'dell-poweredge-r740-server',
     '2x Xeon Gold processors, 128GB RAM, 4TB storage. Barely used.', 
     electronics_cat, electronics_id, supplier_id,
     'https://images.unsplash.com/photo-1558494949-ef010cbdcc31', 
     450000, 292500, 35,
     'Hyderabad', 'Telangana', 'like-new', 'fixed', 'active',
     4.7, 11, 234, 31, 3, 1, true,
     false, true, true, 0, 80,
     NULL, CURRENT_TIMESTAMP - INTERVAL '1 day'),

    ('Industrial Air Compressor - Atlas Copco', 'industrial-air-compressor-atlas-copco',
     '100HP rotary screw compressor. Energy-efficient with low hours.', 
     machinery_cat, manufacturing_id, supplier_id,
     'https://images.unsplash.com/photo-1581092918484-8313e7d57f1b', 
     850000, 510000, 40,
     'Ahmedabad', 'Gujarat', 'good', 'auction', 'active',
     4.4, 9, 178, 25, 1, 1, true,
     false, true, true, 0, 75,
     CURRENT_TIMESTAMP + INTERVAL '3 days', CURRENT_TIMESTAMP - INTERVAL '2 days'),

    ('Forklift - Toyota 3 Ton', 'forklift-toyota-3-ton',
     'Diesel forklift, 3-ton capacity. Well-maintained with service records.', 
     machinery_cat, construction_id, supplier_id,
     'https://images.unsplash.com/photo-1581092162384-8987c1d64718', 
     680000, 476000, 30,
     'Coimbatore', 'Tamil Nadu', 'good', 'fixed', 'active',
     4.5, 14, 267, 38, 2, 1, true,
     false, true, false, 0, 70,
     NULL, CURRENT_TIMESTAMP - INTERVAL '5 days'),

    ('HP LaserJet Enterprise Printer', 'hp-laserjet-enterprise-printer',
     'High-speed office printer with duplex. Corporate surplus stock.', 
     electronics_cat, electronics_id, supplier_id,
     'https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6', 
     75000, 45000, 40,
     'Delhi', 'Delhi', 'new', 'fixed', 'active',
     4.3, 22, 445, 56, 15, 1, true,
     false, true, true, 0, 65,
     NULL, CURRENT_TIMESTAMP - INTERVAL '1 day'),

    -- Trending Products
    ('Welding Machine - Miller Dynasty', 'welding-machine-miller-dynasty',
     'TIG welding machine with AC/DC capability. Professional grade.', 
     machinery_cat, manufacturing_id, supplier_id,
     'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789', 
     180000, 126000, 30,
     'Surat', 'Gujarat', 'good', 'negotiable', 'active',
     4.6, 7, 312, 44, 2, 1, true,
     false, false, true, 0, 0,
     NULL, CURRENT_TIMESTAMP - INTERVAL '3 days'),

    ('Drilling Machine - Bosch Industrial', 'drilling-machine-bosch-industrial',
     'Heavy-duty drilling machine with variable speed control.', 
     machinery_cat, manufacturing_id, supplier_id,
     'https://images.unsplash.com/photo-1581092335397-9583eb92d232', 
     125000, 87500, 30,
     'Jaipur', 'Rajasthan', 'good', 'fixed', 'active',
     4.4, 10, 289, 39, 3, 1, false,
     false, false, true, 0, 0,
     NULL, CURRENT_TIMESTAMP - INTERVAL '2 days'),

    ('Genset - Cummins 125 KVA', 'genset-cummins-125-kva',
     'Diesel generator set with AMF panel. Low running hours.', 
     machinery_cat, manufacturing_id, supplier_id,
     'https://images.unsplash.com/photo-1581092160607-ee67e394691f', 
     950000, 712500, 25,
     'Kolkata', 'West Bengal', 'good', 'fixed', 'active',
     4.7, 5, 198, 27, 1, 1, true,
     false, false, true, 0, 0,
     NULL, CURRENT_TIMESTAMP - INTERVAL '4 days'),

    ('Pallet Racking System - 50 Bays', 'pallet-racking-system-50-bays',
     'Complete warehouse racking system. Includes beams and uprights.', 
     machinery_cat, construction_id, supplier_id,
     'https://images.unsplash.com/photo-1581092918899-1b66f0e3ac34', 
     380000, 266000, 30,
     'Nagpur', 'Maharashtra', 'good', 'fixed', 'active',
     4.5, 8, 223, 32, 1, 1, false,
     false, false, true, 0, 0,
     NULL, CURRENT_TIMESTAMP - INTERVAL '6 days'),

    -- Regular Products
    ('Laptop - Dell Latitude 7490', 'laptop-dell-latitude-7490',
     'Core i7, 16GB RAM, 512GB SSD. Corporate refurbished.', 
     electronics_cat, electronics_id, supplier_id,
     'https://images.unsplash.com/photo-1496181133206-80ce9b88a853', 
     65000, 45500, 30,
     'Mumbai', 'Maharashtra', 'like-new', 'fixed', 'active',
     4.6, 28, 567, 72, 25, 1, true,
     false, false, false, 0, 0,
     NULL, CURRENT_TIMESTAMP - INTERVAL '1 day'),

    ('Office Chairs - Ergonomic - Bulk 50', 'office-chairs-ergonomic-bulk-50',
     'Premium office chairs with lumbar support. Office closure sale.', 
     electronics_cat, electronics_id, supplier_id,
     'https://images.unsplash.com/photo-1580480055273-228ff5388ef8', 
     125000, 75000, 40,
     'Bangalore', 'Karnataka', 'good', 'fixed', 'active',
     4.4, 15, 389, 48, 50, 10, false,
     false, false, false, 0, 0,
     NULL, CURRENT_TIMESTAMP - INTERVAL '2 days'),

    ('3D Printer - Ultimaker S5', '3d-printer-ultimaker-s5',
     'Professional 3D printer with dual extrusion. Lightly used.', 
     electronics_cat, electronics_id, supplier_id,
     'https://images.unsplash.com/photo-1565610222536-ef125c59da2e', 
     480000, 336000, 30,
     'Pune', 'Maharashtra', 'like-new', 'negotiable', 'active',
     4.8, 4, 178, 23, 1, 1, true,
     false, false, false, 0, 0,
     NULL, CURRENT_TIMESTAMP - INTERVAL '3 days'),

    ('Industrial Mixer - 500L', 'industrial-mixer-500l',
     'Stainless steel industrial mixer for food processing.', 
     machinery_cat, manufacturing_id, supplier_id,
     'https://images.unsplash.com/photo-1581093577421-f561a654a353', 
     350000, 262500, 25,
     'Vadodara', 'Gujarat', 'good', 'fixed', 'active',
     4.5, 6, 145, 19, 1, 1, false,
     false, false, false, 0, 0,
     NULL, CURRENT_TIMESTAMP - INTERVAL '5 days'),

    ('Conveyor Belt System - 20 meters', 'conveyor-belt-system-20-meters',
     'Complete conveyor system with motor and controls.', 
     machinery_cat, manufacturing_id, supplier_id,
     'https://images.unsplash.com/photo-1581092918991-32c8f47c45bb', 
     280000, 196000, 30,
     'Indore', 'Madhya Pradesh', 'good', 'auction', 'active',
     4.3, 9, 201, 26, 1, 1, false,
     false, false, false, 0, 0,
     CURRENT_TIMESTAMP + INTERVAL '4 days', CURRENT_TIMESTAMP - INTERVAL '1 day'),

    ('Car Battery Charger - Industrial', 'car-battery-charger-industrial',
     'Heavy-duty battery charger for automotive workshop.', 
     automotive_cat, automotive_id, supplier_id,
     'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e', 
     45000, 31500, 30,
     'Ludhiana', 'Punjab', 'good', 'fixed', 'active',
     4.4, 12, 312, 41, 5, 1, false,
     false, false, false, 0, 0,
     NULL, CURRENT_TIMESTAMP - INTERVAL '3 days'),

    ('Conference Room Table - 12 Seater', 'conference-room-table-12-seater',
     'Premium wooden conference table with cable management.', 
     electronics_cat, electronics_id, supplier_id,
     'https://images.unsplash.com/photo-1577140917170-285929fb55b7', 
     85000, 59500, 30,
     'Noida', 'Uttar Pradesh', 'good', 'fixed', 'active',
     4.2, 7, 234, 29, 2, 1, false,
     false, false, false, 0, 0,
     NULL, CURRENT_TIMESTAMP - INTERVAL '4 days'),

    ('Industrial Vacuum Cleaner', 'industrial-vacuum-cleaner',
     'Heavy-duty vacuum for workshop and factory cleaning.', 
     machinery_cat, manufacturing_id, supplier_id,
     'https://images.unsplash.com/photo-1581093458791-9f3c3250a8e0', 
     38000, 26600, 30,
     'Rajkot', 'Gujarat', 'good', 'fixed', 'active',
     4.3, 11, 276, 35, 4, 1, false,
     false, false, false, 0, 0,
     NULL, CURRENT_TIMESTAMP - INTERVAL '2 days');

END $$;

-- =====================================================
-- 4. UPDATE PRODUCT COUNTS
-- =====================================================
UPDATE categories SET product_count = (
    SELECT COUNT(*) FROM products WHERE category_id = categories.id AND status = 'active'
);

UPDATE industries SET product_count = (
    SELECT COUNT(*) FROM products WHERE industry_id = industries.id AND status = 'active'
);

-- =====================================================
-- SEED DATA COMPLETE
-- Total Products: 20 (3 sponsored, 5 featured, 5 trending, 7 regular)
-- Industries: 10
-- Cities covered: 15+ across India
-- =====================================================
