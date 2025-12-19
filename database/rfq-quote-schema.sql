-- =====================================================
-- RFQ AND QUOTE SYSTEM MIGRATION
-- Version: 1.0
-- Date: December 17, 2025
-- Description: Complete schema for RFQ and Quote management
-- =====================================================

-- Drop existing tables if they exist (careful in production!)
DROP TABLE IF EXISTS quote_messages CASCADE;
DROP TABLE IF EXISTS quotes CASCADE;
DROP TABLE IF EXISTS rfqs CASCADE;

-- =====================================================
-- RFQs TABLE
-- =====================================================
CREATE TABLE rfqs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rfq_number VARCHAR(50) UNIQUE NOT NULL,
  buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  industry_id UUID REFERENCES industries(id) ON DELETE SET NULL,
  quantity NUMERIC(15,2) NOT NULL CHECK (quantity > 0),
  unit VARCHAR(50) NOT NULL,
  budget_min NUMERIC(15,2) CHECK (budget_min >= 0),
  budget_max NUMERIC(15,2) CHECK (budget_max >= 0),
  required_by_date DATE,
  detailed_requirements TEXT,
  preferred_location VARCHAR(255),
  duration_days INTEGER DEFAULT 7 CHECK (duration_days > 0),
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'closed', 'expired', 'fulfilled')),
  attachments JSONB DEFAULT '[]'::jsonb,
  view_count INTEGER DEFAULT 0,
  quote_count INTEGER DEFAULT 0,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT valid_budget CHECK (budget_max IS NULL OR budget_min IS NULL OR budget_max >= budget_min)
);

-- Indexes for RFQs
CREATE INDEX idx_rfqs_buyer_id ON rfqs(buyer_id);
CREATE INDEX idx_rfqs_status ON rfqs(status);
CREATE INDEX idx_rfqs_category_id ON rfqs(category_id);
CREATE INDEX idx_rfqs_industry_id ON rfqs(industry_id);
CREATE INDEX idx_rfqs_expires_at ON rfqs(expires_at) WHERE status = 'active';
CREATE INDEX idx_rfqs_created_at ON rfqs(created_at DESC);

-- =====================================================
-- QUOTES TABLE
-- =====================================================
CREATE TABLE quotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quote_number VARCHAR(50) UNIQUE NOT NULL,
  rfq_id UUID NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  quote_price NUMERIC(15,2) NOT NULL CHECK (quote_price >= 0),
  original_price NUMERIC(15,2) CHECK (original_price >= 0),
  discount_percent NUMERIC(5,2) CHECK (discount_percent >= 0 AND discount_percent <= 100),
  quantity NUMERIC(15,2) NOT NULL CHECK (quantity > 0),
  unit VARCHAR(50) NOT NULL,
  delivery_days INTEGER CHECK (delivery_days > 0),
  valid_until DATE NOT NULL,
  payment_terms TEXT,
  shipping_terms TEXT,
  notes TEXT,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired', 'converted')),
  accepted_at TIMESTAMP,
  rejected_at TIMESTAMP,
  rejection_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT valid_dates CHECK (valid_until >= CURRENT_DATE),
  CONSTRAINT valid_discount CHECK (original_price IS NULL OR quote_price IS NULL OR original_price >= quote_price)
);

-- Indexes for Quotes
CREATE INDEX idx_quotes_rfq_id ON quotes(rfq_id);
CREATE INDEX idx_quotes_buyer_id ON quotes(buyer_id);
CREATE INDEX idx_quotes_supplier_id ON quotes(supplier_id);
CREATE INDEX idx_quotes_product_id ON quotes(product_id);
CREATE INDEX idx_quotes_status ON quotes(status);
CREATE INDEX idx_quotes_valid_until ON quotes(valid_until) WHERE status = 'pending';
CREATE INDEX idx_quotes_created_at ON quotes(created_at DESC);

-- =====================================================
-- QUOTE MESSAGES TABLE
-- =====================================================
CREATE TABLE quote_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  attachments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for Quote Messages
CREATE INDEX idx_quote_messages_quote_id ON quote_messages(quote_id);
CREATE INDEX idx_quote_messages_sender_id ON quote_messages(sender_id);
CREATE INDEX idx_quote_messages_receiver_id ON quote_messages(receiver_id);
CREATE INDEX idx_quote_messages_created_at ON quote_messages(created_at DESC);
CREATE INDEX idx_quote_messages_unread ON quote_messages(receiver_id) WHERE is_read = FALSE;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Auto-update updated_at timestamp for rfqs
CREATE OR REPLACE FUNCTION update_rfqs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER rfqs_updated_at_trigger
BEFORE UPDATE ON rfqs
FOR EACH ROW
EXECUTE FUNCTION update_rfqs_updated_at();

-- Auto-update updated_at timestamp for quotes
CREATE OR REPLACE FUNCTION update_quotes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER quotes_updated_at_trigger
BEFORE UPDATE ON quotes
FOR EACH ROW
EXECUTE FUNCTION update_quotes_updated_at();

-- Increment RFQ quote_count when quote is created
CREATE OR REPLACE FUNCTION increment_rfq_quote_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE rfqs 
  SET quote_count = quote_count + 1,
      updated_at = NOW()
  WHERE id = NEW.rfq_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER increment_quote_count_trigger
AFTER INSERT ON quotes
FOR EACH ROW
EXECUTE FUNCTION increment_rfq_quote_count();

-- Decrement RFQ quote_count when quote is deleted
CREATE OR REPLACE FUNCTION decrement_rfq_quote_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE rfqs 
  SET quote_count = GREATEST(0, quote_count - 1),
      updated_at = NOW()
  WHERE id = OLD.rfq_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER decrement_quote_count_trigger
AFTER DELETE ON quotes
FOR EACH ROW
EXECUTE FUNCTION decrement_rfq_quote_count();

-- Auto-expire RFQs
CREATE OR REPLACE FUNCTION expire_old_rfqs()
RETURNS void AS $$
BEGIN
  UPDATE rfqs
  SET status = 'expired',
      updated_at = NOW()
  WHERE status = 'active'
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Auto-expire quotes
CREATE OR REPLACE FUNCTION expire_old_quotes()
RETURNS void AS $$
BEGIN
  UPDATE quotes
  SET status = 'expired',
      updated_at = NOW()
  WHERE status = 'pending'
    AND valid_until < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE rfqs IS 'Request for Quotes from buyers to suppliers';
COMMENT ON TABLE quotes IS 'Supplier quotes in response to buyer RFQs';
COMMENT ON TABLE quote_messages IS 'Messages between buyers and suppliers regarding specific quotes';

COMMENT ON COLUMN rfqs.rfq_number IS 'Unique RFQ identifier shown to users';
COMMENT ON COLUMN rfqs.duration_days IS 'Number of days the RFQ remains active';
COMMENT ON COLUMN rfqs.view_count IS 'Number of times suppliers have viewed this RFQ';
COMMENT ON COLUMN rfqs.quote_count IS 'Number of quotes received for this RFQ';

COMMENT ON COLUMN quotes.quote_number IS 'Unique quote identifier shown to users';
COMMENT ON COLUMN quotes.discount_percent IS 'Percentage discount from original_price to quote_price';
COMMENT ON COLUMN quotes.payment_terms IS 'Payment terms offered by supplier (e.g., 30% advance, 70% on delivery)';
COMMENT ON COLUMN quotes.shipping_terms IS 'Shipping/delivery terms (e.g., FOB, CIF, DDP)';

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant necessary permissions to application user
-- GRANT SELECT, INSERT, UPDATE, DELETE ON rfqs TO zeerostock_app;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON quotes TO zeerostock_app;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON quote_messages TO zeerostock_app;

-- =====================================================
-- SAMPLE DATA (Optional - for development)
-- =====================================================

-- Insert sample RFQ (commented out for production)
/*
INSERT INTO rfqs (
  rfq_number, buyer_id, title, category_id, quantity, unit,
  budget_min, budget_max, required_by_date, detailed_requirements,
  duration_days, status
) VALUES (
  'RFQ-1734441600-001',
  (SELECT id FROM users WHERE role = 'buyer' LIMIT 1),
  'Industrial Steel Coils - High Grade',
  (SELECT id FROM categories WHERE name = 'Materials' LIMIT 1),
  500,
  'Metric Ton (MT)',
  15000000,
  20000000,
  CURRENT_DATE + INTERVAL '30 days',
  'Require high-grade steel coils for construction project. Must meet ASTM A36 specifications.',
  14,
  'active'
);
*/

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Verify tables created
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN ('rfqs', 'quotes', 'quote_messages') 
  AND table_schema = 'public';

-- Verify indexes
SELECT indexname, tablename 
FROM pg_indexes 
WHERE tablename IN ('rfqs', 'quotes', 'quote_messages');

-- Verify triggers
SELECT trigger_name, event_object_table, action_statement
FROM information_schema.triggers
WHERE event_object_table IN ('rfqs', 'quotes');

-- =====================================================
-- ROLLBACK SCRIPT (if needed)
-- =====================================================

/*
-- To rollback this migration:
DROP TRIGGER IF EXISTS rfqs_updated_at_trigger ON rfqs;
DROP TRIGGER IF EXISTS quotes_updated_at_trigger ON quotes;
DROP TRIGGER IF EXISTS increment_quote_count_trigger ON quotes;
DROP TRIGGER IF EXISTS decrement_quote_count_trigger ON quotes;

DROP FUNCTION IF EXISTS update_rfqs_updated_at();
DROP FUNCTION IF EXISTS update_quotes_updated_at();
DROP FUNCTION IF EXISTS increment_rfq_quote_count();
DROP FUNCTION IF EXISTS decrement_rfq_quote_count();
DROP FUNCTION IF EXISTS expire_old_rfqs();
DROP FUNCTION IF EXISTS expire_old_quotes();

DROP TABLE IF EXISTS quote_messages CASCADE;
DROP TABLE IF EXISTS quotes CASCADE;
DROP TABLE IF EXISTS rfqs CASCADE;
*/

-- =====================================================
-- END OF MIGRATION
-- =====================================================

SELECT 'RFQ and Quote system migration completed successfully!' AS status;
