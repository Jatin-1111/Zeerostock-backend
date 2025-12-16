-- =====================================================
-- ZEEROSTOCK B2B MARKETPLACE - BUYER ACCOUNT SCHEMA
-- Buyer Dashboard, Orders, Watchlist, Reviews, Notifications, Support
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. ORDERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(50) NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Order Details
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    payment_status VARCHAR(50) NOT NULL DEFAULT 'pending',
    
    -- Pricing
    items_subtotal DECIMAL(15,2) NOT NULL,
    discount_amount DECIMAL(15,2) DEFAULT 0,
    coupon_discount DECIMAL(15,2) DEFAULT 0,
    coupon_code VARCHAR(50),
    gst_amount DECIMAL(15,2) NOT NULL,
    cgst_amount DECIMAL(15,2),
    sgst_amount DECIMAL(15,2),
    igst_amount DECIMAL(15,2),
    shipping_charges DECIMAL(15,2) DEFAULT 0,
    platform_fee DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) NOT NULL,
    
    -- Shipping Information
    shipping_address JSONB NOT NULL,
    billing_address JSONB,
    
    -- Delivery
    delivery_eta TIMESTAMP WITH TIME ZONE,
    shipping_partner VARCHAR(100),
    tracking_number VARCHAR(100),
    
    -- Payment
    payment_method VARCHAR(50),
    payment_transaction_id VARCHAR(255),
    payment_date TIMESTAMP WITH TIME ZONE,
    
    -- Documents
    invoice_url TEXT,
    invoice_number VARCHAR(50),
    
    -- Metadata
    order_notes TEXT,
    admin_notes TEXT,
    cancellation_reason TEXT,
    cancelled_by UUID REFERENCES users(id),
    cancelled_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT chk_order_status CHECK (status IN (
        'pending', 'confirmed', 'processing', 'shipped', 'delivered', 
        'cancelled', 'refunded', 'failed'
    )),
    CONSTRAINT chk_payment_status CHECK (payment_status IN (
        'pending', 'paid', 'failed', 'refunded', 'partially_refunded'
    ))
);

-- Indexes for orders
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_order_number ON orders(order_number);
CREATE INDEX idx_orders_tracking ON orders(tracking_number);

-- =====================================================
-- 2. ORDER ITEMS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    
    -- Product snapshot (captured at order time)
    product_title VARCHAR(500) NOT NULL,
    product_sku VARCHAR(100),
    product_image TEXT,
    product_category VARCHAR(100),
    
    -- Pricing
    unit_price DECIMAL(15,2) NOT NULL,
    discount_percent DECIMAL(5,2) DEFAULT 0,
    discount_amount DECIMAL(15,2) DEFAULT 0,
    final_price DECIMAL(15,2) NOT NULL,
    quantity INTEGER NOT NULL,
    subtotal DECIMAL(15,2) NOT NULL,
    gst_percent DECIMAL(5,2) DEFAULT 18,
    gst_amount DECIMAL(15,2) NOT NULL,
    
    -- Item Status
    item_status VARCHAR(50) DEFAULT 'pending',
    
    -- Supplier Info
    supplier_id UUID REFERENCES users(id) ON DELETE SET NULL,
    supplier_name VARCHAR(255),
    supplier_city VARCHAR(100),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT chk_order_item_status CHECK (item_status IN (
        'pending', 'confirmed', 'processing', 'shipped', 'delivered', 
        'cancelled', 'refunded'
    ))
);

-- Indexes for order_items
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);
CREATE INDEX idx_order_items_supplier ON order_items(supplier_id);

-- =====================================================
-- 3. ORDER TRACKING TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS order_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    
    -- Tracking Details
    status VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    location VARCHAR(255),
    
    -- Metadata
    is_milestone BOOLEAN DEFAULT false,
    metadata JSONB,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for order_tracking
CREATE INDEX idx_order_tracking_order ON order_tracking(order_id, created_at DESC);

-- =====================================================
-- 4. WATCHLIST TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS watchlist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    
    -- Metadata
    price_at_add DECIMAL(15,2),
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, product_id)
);

-- Indexes for watchlist
CREATE INDEX idx_watchlist_user ON watchlist(user_id, created_at DESC);
CREATE INDEX idx_watchlist_product ON watchlist(product_id);

-- =====================================================
-- 5. RECENTLY VIEWED TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS recently_viewed (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    
    -- Tracking
    view_count INTEGER DEFAULT 1,
    last_viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, product_id)
);

-- Indexes for recently_viewed
CREATE INDEX idx_recently_viewed_user ON recently_viewed(user_id, last_viewed_at DESC);
CREATE INDEX idx_recently_viewed_product ON recently_viewed(product_id);

-- =====================================================
-- 6. REVIEWS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    
    -- Review Content
    rating DECIMAL(2,1) NOT NULL,
    title VARCHAR(200),
    comment TEXT NOT NULL,
    
    -- Media
    images JSONB DEFAULT '[]',
    videos JSONB DEFAULT '[]',
    
    -- Verification
    is_verified_purchase BOOLEAN DEFAULT false,
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending',
    is_visible BOOLEAN DEFAULT true,
    
    -- Helpfulness
    helpful_count INTEGER DEFAULT 0,
    not_helpful_count INTEGER DEFAULT 0,
    
    -- Supplier Response
    supplier_response TEXT,
    supplier_response_date TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT chk_review_rating CHECK (rating >= 1 AND rating <= 5),
    CONSTRAINT chk_review_status CHECK (status IN ('pending', 'approved', 'rejected')),
    UNIQUE(buyer_id, product_id, order_id)
);

-- Indexes for reviews
CREATE INDEX idx_reviews_product ON reviews(product_id, is_visible, status);
CREATE INDEX idx_reviews_buyer ON reviews(buyer_id, created_at DESC);
CREATE INDEX idx_reviews_order ON reviews(order_id);
CREATE INDEX idx_reviews_rating ON reviews(rating DESC);
CREATE INDEX idx_reviews_status ON reviews(status, created_at DESC);

-- =====================================================
-- 7. REVIEW HELPFULNESS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS review_helpfulness (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    is_helpful BOOLEAN NOT NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(review_id, user_id)
);

-- Indexes for review_helpfulness
CREATE INDEX idx_review_helpfulness_review ON review_helpfulness(review_id);
CREATE INDEX idx_review_helpfulness_user ON review_helpfulness(user_id);

-- =====================================================
-- 8. NOTIFICATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Notification Content
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    
    -- Linked Resources
    resource_type VARCHAR(50),
    resource_id UUID,
    action_url TEXT,
    
    -- Status
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    
    -- Priority
    priority VARCHAR(20) DEFAULT 'normal',
    
    -- Metadata
    data JSONB,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT chk_notification_type CHECK (type IN (
        'order_confirmed', 'order_shipped', 'order_delivered', 'order_cancelled',
        'payment_success', 'payment_failed', 'payment_refund',
        'auction_won', 'auction_lost', 'auction_outbid', 'auction_ending',
        'price_drop', 'back_in_stock', 'watchlist_update',
        'review_response', 'message_received',
        'system', 'promotion', 'account'
    )),
    CONSTRAINT chk_notification_priority CHECK (priority IN ('low', 'normal', 'high', 'urgent'))
);

-- Indexes for notifications
CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_expires ON notifications(expires_at) WHERE expires_at IS NOT NULL;

-- =====================================================
-- 9. SUPPORT TICKETS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_number VARCHAR(50) NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Ticket Details
    category VARCHAR(100) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'medium',
    status VARCHAR(20) DEFAULT 'open',
    
    -- Assignment
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    assigned_at TIMESTAMP WITH TIME ZONE,
    
    -- Linked Resources
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    
    -- Attachments
    attachments JSONB DEFAULT '[]',
    
    -- Resolution
    resolution_notes TEXT,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMP WITH TIME ZONE,
    
    -- Ratings
    satisfaction_rating INTEGER,
    feedback TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    closed_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT chk_ticket_priority CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    CONSTRAINT chk_ticket_status CHECK (status IN ('open', 'in_progress', 'waiting_customer', 'resolved', 'closed')),
    CONSTRAINT chk_satisfaction_rating CHECK (satisfaction_rating IS NULL OR (satisfaction_rating >= 1 AND satisfaction_rating <= 5))
);

-- Indexes for support_tickets
CREATE INDEX idx_support_tickets_user ON support_tickets(user_id, created_at DESC);
CREATE INDEX idx_support_tickets_status ON support_tickets(status, priority DESC);
CREATE INDEX idx_support_tickets_number ON support_tickets(ticket_number);
CREATE INDEX idx_support_tickets_assigned ON support_tickets(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX idx_support_tickets_order ON support_tickets(order_id) WHERE order_id IS NOT NULL;

-- =====================================================
-- 10. SUPPORT TICKET MESSAGES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS support_ticket_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Message Content
    message TEXT NOT NULL,
    attachments JSONB DEFAULT '[]',
    
    -- Metadata
    is_internal BOOLEAN DEFAULT false,
    is_auto_response BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for support_ticket_messages
CREATE INDEX idx_support_messages_ticket ON support_ticket_messages(ticket_id, created_at ASC);
CREATE INDEX idx_support_messages_sender ON support_ticket_messages(sender_id);

-- =====================================================
-- 11. USER ADDRESSES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS user_addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Address Details
    address_type VARCHAR(20) NOT NULL,
    label VARCHAR(100),
    
    contact_name VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(20) NOT NULL,
    
    address_line1 VARCHAR(500) NOT NULL,
    address_line2 VARCHAR(500),
    landmark VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    pincode VARCHAR(10) NOT NULL,
    country VARCHAR(100) DEFAULT 'India',
    
    -- Default Settings
    is_default BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT chk_address_type CHECK (address_type IN ('shipping', 'billing', 'both'))
);

-- Indexes for user_addresses
CREATE INDEX idx_user_addresses_user ON user_addresses(user_id);
CREATE INDEX idx_user_addresses_default ON user_addresses(user_id, is_default) WHERE is_default = true;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_support_tickets_updated_at BEFORE UPDATE ON support_tickets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_addresses_updated_at BEFORE UPDATE ON user_addresses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-generate order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.order_number := 'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('order_number_seq')::TEXT, 6, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1;

CREATE TRIGGER generate_order_number_trigger
    BEFORE INSERT ON orders
    FOR EACH ROW
    WHEN (NEW.order_number IS NULL)
    EXECUTE FUNCTION generate_order_number();

-- Auto-generate ticket number
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.ticket_number := 'TKT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('ticket_number_seq')::TEXT, 5, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE IF NOT EXISTS ticket_number_seq START 1;

CREATE TRIGGER generate_ticket_number_trigger
    BEFORE INSERT ON support_tickets
    FOR EACH ROW
    WHEN (NEW.ticket_number IS NULL)
    EXECUTE FUNCTION generate_ticket_number();

-- Update review counts and ratings on products
CREATE OR REPLACE FUNCTION update_product_review_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.status = 'approved' AND NEW.is_visible = true THEN
        UPDATE products
        SET 
            review_count = review_count + 1,
            rating = (
                SELECT COALESCE(AVG(rating), 0)
                FROM reviews
                WHERE product_id = NEW.product_id 
                AND status = 'approved' 
                AND is_visible = true
            )
        WHERE id = NEW.product_id;
    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE products
        SET 
            review_count = (
                SELECT COUNT(*)
                FROM reviews
                WHERE product_id = NEW.product_id 
                AND status = 'approved' 
                AND is_visible = true
            ),
            rating = (
                SELECT COALESCE(AVG(rating), 0)
                FROM reviews
                WHERE product_id = NEW.product_id 
                AND status = 'approved' 
                AND is_visible = true
            )
        WHERE id = NEW.product_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE products
        SET 
            review_count = GREATEST(0, review_count - 1),
            rating = (
                SELECT COALESCE(AVG(rating), 0)
                FROM reviews
                WHERE product_id = OLD.product_id 
                AND status = 'approved' 
                AND is_visible = true
            )
        WHERE id = OLD.product_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_product_review_stats_trigger
    AFTER INSERT OR UPDATE OR DELETE ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_product_review_stats();

-- Cleanup old recently_viewed records (keep only 50 per user)
CREATE OR REPLACE FUNCTION cleanup_recently_viewed()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM recently_viewed
    WHERE user_id = NEW.user_id
    AND id NOT IN (
        SELECT id FROM recently_viewed
        WHERE user_id = NEW.user_id
        ORDER BY last_viewed_at DESC
        LIMIT 50
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cleanup_recently_viewed_trigger
    AFTER INSERT OR UPDATE ON recently_viewed
    FOR EACH ROW
    EXECUTE FUNCTION cleanup_recently_viewed();

-- =====================================================
-- UTILITY FUNCTIONS
-- =====================================================

-- Function to get buyer order statistics
CREATE OR REPLACE FUNCTION get_buyer_order_stats(buyer_user_id UUID)
RETURNS TABLE(
    total_orders BIGINT,
    active_orders BIGINT,
    completed_orders BIGINT,
    cancelled_orders BIGINT,
    total_spent NUMERIC,
    average_order_value NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total_orders,
        COUNT(*) FILTER (WHERE status IN ('pending', 'confirmed', 'processing', 'shipped'))::BIGINT as active_orders,
        COUNT(*) FILTER (WHERE status = 'delivered')::BIGINT as completed_orders,
        COUNT(*) FILTER (WHERE status = 'cancelled')::BIGINT as cancelled_orders,
        COALESCE(SUM(total_amount) FILTER (WHERE status NOT IN ('cancelled', 'failed')), 0) as total_spent,
        COALESCE(AVG(total_amount) FILTER (WHERE status NOT IN ('cancelled', 'failed')), 0) as average_order_value
    FROM orders
    WHERE user_id = buyer_user_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE orders IS 'Stores all buyer orders with complete order information';
COMMENT ON TABLE order_items IS 'Individual items in each order with product snapshots';
COMMENT ON TABLE order_tracking IS 'Order status tracking and shipment updates';
COMMENT ON TABLE watchlist IS 'Products saved by buyers for later viewing';
COMMENT ON TABLE recently_viewed IS 'Recently viewed products by buyers';
COMMENT ON TABLE reviews IS 'Product reviews and ratings by buyers';
COMMENT ON TABLE notifications IS 'User notifications for various events';
COMMENT ON TABLE support_tickets IS 'Customer support tickets';
COMMENT ON TABLE support_ticket_messages IS 'Messages within support tickets';
COMMENT ON TABLE user_addresses IS 'User shipping and billing addresses';
