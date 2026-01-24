-- ==========================================
-- PAYMENT METHODS SCHEMA
-- ==========================================
-- This schema handles supplier payment methods for receiving payouts
-- Supports: Credit/Debit Cards, Bank Accounts (Escrow/PayPal), and UPI

CREATE TABLE IF NOT EXISTS payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Payment Method Type
    type VARCHAR(20) NOT NULL CHECK (type IN ('card', 'bank', 'upi')),
    
    -- Common Fields
    is_primary BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending_verification', 'failed_verification')),
    
    -- Card Details (for type = 'card')
    card_last_four VARCHAR(4),
    card_brand VARCHAR(50), -- Visa, Mastercard, American Express
    card_holder_name VARCHAR(255),
    card_expiry_month INTEGER CHECK (card_expiry_month BETWEEN 1 AND 12),
    card_expiry_year INTEGER,
    card_token VARCHAR(500), -- Encrypted token from payment gateway
    
    -- Bank/Escrow Details (for type = 'bank')
    bank_account_holder_name VARCHAR(255),
    bank_account_number_last_four VARCHAR(4),
    bank_name VARCHAR(255),
    bank_ifsc_code VARCHAR(20),
    bank_account_type VARCHAR(20) CHECK (bank_account_type IN ('savings', 'current', 'escrow')),
    paypal_email VARCHAR(255),
    
    -- UPI Details (for type = 'upi')
    upi_id VARCHAR(255),
    upi_provider VARCHAR(50), -- Google Pay, PhonePe, Paytm, etc.
    
    -- Metadata
    nickname VARCHAR(100), -- User-friendly name for the payment method
    processing_fee_percent DECIMAL(5, 2) DEFAULT 0.00,
    processing_time VARCHAR(50), -- e.g., "Instant", "2-14 days"
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    verified_at TIMESTAMP,
    last_used_at TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_payment_methods_supplier_id ON payment_methods(supplier_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_type ON payment_methods(type);
CREATE INDEX IF NOT EXISTS idx_payment_methods_status ON payment_methods(status);
CREATE INDEX IF NOT EXISTS idx_payment_methods_is_primary ON payment_methods(supplier_id, is_primary) WHERE is_primary = TRUE;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_payment_methods_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_payment_methods_updated_at
    BEFORE UPDATE ON payment_methods
    FOR EACH ROW
    EXECUTE FUNCTION update_payment_methods_updated_at();

-- Ensure only one primary payment method per supplier
CREATE OR REPLACE FUNCTION ensure_single_primary_payment_method()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_primary = TRUE THEN
        UPDATE payment_methods
        SET is_primary = FALSE
        WHERE supplier_id = NEW.supplier_id
          AND id != NEW.id
          AND is_primary = TRUE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ensure_single_primary_payment_method
    BEFORE INSERT OR UPDATE ON payment_methods
    FOR EACH ROW
    WHEN (NEW.is_primary = TRUE)
    EXECUTE FUNCTION ensure_single_primary_payment_method();

-- Comments for documentation
COMMENT ON TABLE payment_methods IS 'Stores supplier payment methods for receiving payouts from sales';
COMMENT ON COLUMN payment_methods.type IS 'Type of payment method: card, bank, or upi';
COMMENT ON COLUMN payment_methods.is_primary IS 'Whether this is the primary payment method for the supplier';
COMMENT ON COLUMN payment_methods.is_verified IS 'Whether the payment method has been verified';
COMMENT ON COLUMN payment_methods.card_token IS 'Encrypted token from payment gateway (never store actual card numbers)';
COMMENT ON COLUMN payment_methods.processing_fee_percent IS 'Fee percentage charged for this payment method';
