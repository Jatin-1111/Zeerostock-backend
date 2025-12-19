-- =====================================================
-- PAYMENTS AND INVOICES SCHEMA
-- Creates tables for payment transactions and invoices
-- =====================================================

-- Drop tables if they exist (for fresh installation)
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS payments CASCADE;

-- =====================================================
-- PAYMENTS TABLE
-- Stores payment transaction records
-- =====================================================
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id VARCHAR(255) UNIQUE NOT NULL,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    payment_method VARCHAR(50) NOT NULL, -- 'card', 'upi', 'net_banking', 'wallet', etc.
    payment_gateway VARCHAR(100), -- 'razorpay', 'stripe', 'paytm', etc.
    gateway_transaction_id VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed', 'refunded'
    payment_date TIMESTAMP,
    metadata JSONB, -- Additional payment details
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for payments table
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_supplier_id ON payments(supplier_id);
CREATE INDEX IF NOT EXISTS idx_payments_buyer_id ON payments(buyer_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_transaction_id ON payments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);

-- =====================================================
-- INVOICES TABLE
-- Stores invoice records for orders
-- =====================================================
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(15, 2) NOT NULL CHECK (amount >= 0),
    tax_amount DECIMAL(15, 2) DEFAULT 0 CHECK (tax_amount >= 0),
    total_amount DECIMAL(15, 2) NOT NULL CHECK (total_amount > 0),
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'paid', 'overdue', 'cancelled'
    issue_date DATE NOT NULL,
    due_date DATE,
    paid_date DATE,
    notes TEXT,
    metadata JSONB, -- Additional invoice details (tax breakdown, discounts, etc.)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for invoices table
CREATE INDEX IF NOT EXISTS idx_invoices_order_id ON invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_supplier_id ON invoices(supplier_id);
CREATE INDEX IF NOT EXISTS idx_invoices_buyer_id ON invoices(buyer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_issue_date ON invoices(issue_date);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================

-- Trigger for payments table
CREATE OR REPLACE FUNCTION update_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payments_updated_at_trigger
    BEFORE UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_payments_updated_at();

-- Trigger for invoices table
CREATE OR REPLACE FUNCTION update_invoices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER invoices_updated_at_trigger
    BEFORE UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_invoices_updated_at();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE payments IS 'Stores payment transaction records for orders';
COMMENT ON TABLE invoices IS 'Stores invoice records for orders with tax and amount details';

COMMENT ON COLUMN payments.transaction_id IS 'Unique transaction identifier';
COMMENT ON COLUMN payments.payment_method IS 'Payment method used (card, upi, net_banking, etc.)';
COMMENT ON COLUMN payments.payment_gateway IS 'Payment gateway used (razorpay, stripe, etc.)';
COMMENT ON COLUMN payments.status IS 'Payment status (pending, processing, completed, failed, refunded)';

COMMENT ON COLUMN invoices.invoice_number IS 'Unique invoice number';
COMMENT ON COLUMN invoices.status IS 'Invoice status (pending, paid, overdue, cancelled)';
COMMENT ON COLUMN invoices.tax_amount IS 'Tax amount included in the invoice';
COMMENT ON COLUMN invoices.total_amount IS 'Total amount including tax';

-- =====================================================
-- SAMPLE DATA (Optional - for testing)
-- =====================================================

-- Note: To insert sample data, you'll need valid UUIDs for orders, suppliers, and buyers
-- Uncomment and update the following with actual IDs from your database:

/*
-- Sample payment
INSERT INTO payments (
    transaction_id,
    order_id,
    supplier_id,
    buyer_id,
    amount,
    payment_method,
    payment_gateway,
    status,
    payment_date
) VALUES (
    'TXN-' || LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0'),
    'YOUR-ORDER-UUID',
    'YOUR-SUPPLIER-UUID',
    'YOUR-BUYER-UUID',
    15000.00,
    'card',
    'razorpay',
    'completed',
    CURRENT_TIMESTAMP
);

-- Sample invoice
INSERT INTO invoices (
    invoice_number,
    order_id,
    supplier_id,
    buyer_id,
    amount,
    tax_amount,
    total_amount,
    status,
    issue_date,
    due_date
) VALUES (
    'INV-' || LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0'),
    'YOUR-ORDER-UUID',
    'YOUR-SUPPLIER-UUID',
    'YOUR-BUYER-UUID',
    15000.00,
    2700.00,
    17700.00,
    'pending',
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '30 days'
);
*/

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check if tables were created successfully
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
AND table_name IN ('payments', 'invoices')
ORDER BY table_name;

-- Check indexes
SELECT 
    tablename,
    indexname
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('payments', 'invoices')
ORDER BY tablename, indexname;
