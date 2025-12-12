-- =====================================================
-- ZEEROSTOCK B2B MARKETPLACE - CART & CHECKOUT SCHEMA
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. COUPONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS coupons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    
    -- Discount configuration
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'flat')),
    discount_value DECIMAL(15,2) NOT NULL,
    max_discount DECIMAL(15,2), -- For percentage discounts
    
    -- Usage restrictions
    min_order_value DECIMAL(15,2) DEFAULT 0,
    max_usage_per_user INTEGER DEFAULT 1,
    total_usage_limit INTEGER,
    current_usage_count INTEGER DEFAULT 0,
    
    -- Applicability
    applicable_categories JSONB DEFAULT '[]', -- Empty array = all categories
    applicable_products JSONB DEFAULT '[]', -- Empty array = all products
    excluded_products JSONB DEFAULT '[]',
    user_role_restriction VARCHAR(20), -- 'buyer', 'supplier', null = all
    
    -- Validity
    valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    valid_until TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_visible BOOLEAN DEFAULT true, -- Show in coupon listing
    
    -- Metadata
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_coupons_code ON coupons(code) WHERE is_active = true;
CREATE INDEX idx_coupons_validity ON coupons(valid_from, valid_until) WHERE is_active = true;
CREATE INDEX idx_coupons_active ON coupons(is_active, is_visible);

-- =====================================================
-- 2. COUPON USAGE TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS coupon_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_id UUID, -- Will be linked when order is created
    
    -- Usage details
    discount_applied DECIMAL(15,2) NOT NULL,
    order_value DECIMAL(15,2) NOT NULL,
    
    used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(coupon_id, user_id, order_id)
);

CREATE INDEX idx_coupon_usage_user ON coupon_usage(user_id);
CREATE INDEX idx_coupon_usage_coupon ON coupon_usage(coupon_id);

-- =====================================================
-- 3. CART SESSIONS TABLE (For Guest Users)
-- =====================================================
CREATE TABLE IF NOT EXISTS cart_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_token VARCHAR(255) NOT NULL UNIQUE,
    
    -- Session data
    user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- Linked after login
    is_guest BOOLEAN DEFAULT true,
    
    -- Cart metadata
    coupon_code VARCHAR(50),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '30 days',
    
    -- Merged tracking
    merged_to_user_cart BOOLEAN DEFAULT false,
    merged_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_cart_sessions_token ON cart_sessions(session_token);
CREATE INDEX idx_cart_sessions_user ON cart_sessions(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_cart_sessions_guest ON cart_sessions(is_guest, expires_at) WHERE is_guest = true;

-- =====================================================
-- 4. CARTS TABLE (For Logged-in Users)
-- =====================================================
CREATE TABLE IF NOT EXISTS carts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    
    -- Applied coupon
    coupon_id UUID REFERENCES coupons(id) ON DELETE SET NULL,
    coupon_code VARCHAR(50),
    coupon_discount DECIMAL(15,2) DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_carts_user ON carts(user_id);

-- =====================================================
-- 5. CART ITEMS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS cart_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Cart reference (either user cart or guest session)
    cart_id UUID REFERENCES carts(id) ON DELETE CASCADE,
    session_id UUID REFERENCES cart_sessions(id) ON DELETE CASCADE,
    
    -- Product details (snapshot at time of adding)
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    
    -- Price snapshot (locked when added)
    price_at_add DECIMAL(15,2) NOT NULL,
    discount_percent_at_add DECIMAL(5,2) DEFAULT 0,
    gst_percent DECIMAL(5,2) DEFAULT 18, -- Standard GST
    
    -- Product metadata snapshot
    listing_type VARCHAR(50) NOT NULL, -- 'direct_sale', 'rfq', 'auction'
    condition VARCHAR(50),
    unit VARCHAR(50),
    
    -- Seller info
    supplier_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Status tracking
    is_available BOOLEAN DEFAULT true,
    price_changed BOOLEAN DEFAULT false,
    stock_changed BOOLEAN DEFAULT false,
    
    -- Timestamps
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CHECK ((cart_id IS NOT NULL AND session_id IS NULL) OR (cart_id IS NULL AND session_id IS NOT NULL))
);

CREATE INDEX idx_cart_items_cart ON cart_items(cart_id);
CREATE INDEX idx_cart_items_session ON cart_items(session_id);
CREATE INDEX idx_cart_items_product ON cart_items(product_id);
CREATE INDEX idx_cart_items_supplier ON cart_items(supplier_id);

-- =====================================================
-- 6. CHECKOUT SESSIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS checkout_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_token VARCHAR(255) NOT NULL UNIQUE,
    
    -- User reference
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Cart snapshot (frozen at checkout)
    cart_snapshot JSONB NOT NULL,
    
    -- Pricing details (frozen)
    item_subtotal DECIMAL(15,2) NOT NULL,
    discount_amount DECIMAL(15,2) DEFAULT 0,
    coupon_discount DECIMAL(15,2) DEFAULT 0,
    gst_amount DECIMAL(15,2) NOT NULL,
    shipping_charges DECIMAL(15,2) DEFAULT 0,
    platform_fee DECIMAL(15,2) DEFAULT 0,
    final_amount DECIMAL(15,2) NOT NULL,
    
    -- Shipping details
    shipping_city VARCHAR(255),
    shipping_pincode VARCHAR(10),
    shipping_address TEXT,
    
    -- Applied coupon
    coupon_code VARCHAR(50),
    
    -- Session status
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired', 'cancelled')),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '30 minutes',
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_checkout_sessions_user ON checkout_sessions(user_id);
CREATE INDEX idx_checkout_sessions_token ON checkout_sessions(session_token);
CREATE INDEX idx_checkout_sessions_status ON checkout_sessions(status, expires_at);

-- =====================================================
-- 7. SHIPPING ZONES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS shipping_zones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    zone_name VARCHAR(100) NOT NULL,
    states JSONB NOT NULL, -- Array of state names
    
    -- Pricing
    base_charge DECIMAL(10,2) NOT NULL,
    per_kg_charge DECIMAL(10,2) DEFAULT 0,
    free_shipping_threshold DECIMAL(15,2), -- Free shipping above this amount
    
    -- Delivery time
    estimated_days_min INTEGER DEFAULT 3,
    estimated_days_max INTEGER DEFAULT 7,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_shipping_zones_active ON shipping_zones(is_active);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Update updated_at timestamp for carts
CREATE OR REPLACE FUNCTION update_cart_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_carts_timestamp
    BEFORE UPDATE ON carts
    FOR EACH ROW
    EXECUTE FUNCTION update_cart_timestamp();

CREATE TRIGGER trigger_update_cart_items_timestamp
    BEFORE UPDATE ON cart_items
    FOR EACH ROW
    EXECUTE FUNCTION update_cart_timestamp();

CREATE TRIGGER trigger_update_cart_sessions_timestamp
    BEFORE UPDATE ON cart_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_cart_timestamp();

-- Update cart timestamp when cart items change
CREATE OR REPLACE FUNCTION update_parent_cart_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.cart_id IS NOT NULL THEN
        UPDATE carts SET updated_at = NOW() WHERE id = NEW.cart_id;
    ELSIF NEW.session_id IS NOT NULL THEN
        UPDATE cart_sessions SET updated_at = NOW() WHERE id = NEW.session_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_parent_cart_on_item_change
    AFTER INSERT OR UPDATE OR DELETE ON cart_items
    FOR EACH ROW
    EXECUTE FUNCTION update_parent_cart_timestamp();

-- =====================================================
-- SEED DATA
-- =====================================================

-- Sample coupons
INSERT INTO coupons (code, description, discount_type, discount_value, max_discount, min_order_value, max_usage_per_user, total_usage_limit, valid_until, is_active, is_visible) VALUES
('WELCOME10', 'Get 10% off on your first order', 'percentage', 10.00, 5000.00, 10000.00, 1, 1000, NOW() + INTERVAL '90 days', true, true),
('BULK20', '20% off on bulk orders above ₹50,000', 'percentage', 20.00, 15000.00, 50000.00, 3, 500, NOW() + INTERVAL '60 days', true, true),
('FLAT5K', 'Flat ₹5,000 off on orders above ₹1 lakh', 'flat', 5000.00, NULL, 100000.00, 2, 300, NOW() + INTERVAL '45 days', true, true),
('NEWUSER500', 'Flat ₹500 off for new users', 'flat', 500.00, NULL, 5000.00, 1, 5000, NOW() + INTERVAL '120 days', true, true),
('INDUSTRIAL15', '15% off on industrial machinery', 'percentage', 15.00, 20000.00, 25000.00, 5, NULL, NOW() + INTERVAL '30 days', true, true)
ON CONFLICT (code) DO NOTHING;

-- Sample shipping zones
INSERT INTO shipping_zones (zone_name, states, base_charge, per_kg_charge, free_shipping_threshold, estimated_days_min, estimated_days_max, is_active) VALUES
('Metro Cities', '["Maharashtra", "Karnataka", "Delhi", "Tamil Nadu", "Telangana", "Gujarat"]', 500.00, 10.00, 50000.00, 2, 4, true),
('North Zone', '["Punjab", "Haryana", "Himachal Pradesh", "Uttarakhand", "Uttar Pradesh", "Rajasthan"]', 750.00, 12.00, 75000.00, 3, 6, true),
('South Zone', '["Andhra Pradesh", "Kerala", "Puducherry", "Goa"]', 800.00, 12.00, 75000.00, 3, 6, true),
('East Zone', '["West Bengal", "Odisha", "Bihar", "Jharkhand", "Assam", "Tripura", "Meghalaya", "Manipur", "Nagaland", "Mizoram", "Arunachal Pradesh", "Sikkim"]', 900.00, 15.00, 100000.00, 4, 8, true),
('West Zone', '["Madhya Pradesh", "Chhattisgarh"]', 850.00, 13.00, 80000.00, 4, 7, true)
ON CONFLICT DO NOTHING;

-- =====================================================
-- CLEANUP FUNCTIONS
-- =====================================================

-- Function to increment coupon usage count
CREATE OR REPLACE FUNCTION increment_coupon_usage(coupon_uuid UUID)
RETURNS void AS $$
BEGIN
    UPDATE coupons 
    SET current_usage_count = current_usage_count + 1
    WHERE id = coupon_uuid;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired guest cart sessions
CREATE OR REPLACE FUNCTION cleanup_expired_cart_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM cart_sessions 
    WHERE is_guest = true 
    AND expires_at < NOW() 
    AND merged_to_user_cart = false;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired checkout sessions
CREATE OR REPLACE FUNCTION cleanup_expired_checkout_sessions()
RETURNS void AS $$
BEGIN
    UPDATE checkout_sessions 
    SET status = 'expired' 
    WHERE status = 'pending' 
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE carts IS 'User shopping carts for logged-in users';
COMMENT ON TABLE cart_sessions IS 'Guest cart sessions with token-based access';
COMMENT ON TABLE cart_items IS 'Items in cart with price and stock snapshot';
COMMENT ON TABLE coupons IS 'Discount coupons with usage restrictions';
COMMENT ON TABLE checkout_sessions IS 'Checkout sessions with frozen cart state';
COMMENT ON TABLE shipping_zones IS 'Shipping zones with pricing and delivery estimates';
