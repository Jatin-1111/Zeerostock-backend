-- Multi-Role Authentication Schema
-- Creates user_roles table and verification_drafts for buyer ↔ supplier flow

-- 1. Create user_roles table
CREATE TABLE
IF NOT EXISTS user_roles
(
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4
(),
  user_id UUID NOT NULL REFERENCES users
(id) ON
DELETE CASCADE,
  role VARCHAR(20)
NOT NULL CHECK
(role IN
('buyer', 'supplier')),
  is_active BOOLEAN DEFAULT false,
  verified_at TIMESTAMP,
  verification_status VARCHAR
(20) CHECK
(verification_status IN
('pending', 'approved', 'rejected', 'under_review')),
  rejection_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_user_role UNIQUE
(user_id, role)
);

-- 2. Create verification_drafts table for auto-save
CREATE TABLE
IF NOT EXISTS verification_drafts
(
  user_id UUID PRIMARY KEY REFERENCES users
(id) ON
DELETE CASCADE,
  step_data JSONB
DEFAULT '{}'::jsonb,
  current_step INTEGER DEFAULT 1,
  last_saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create supplier_verifications table (full submission data)
CREATE TABLE
IF NOT EXISTS supplier_verifications
(
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4
(),
  user_id UUID NOT NULL REFERENCES users
(id) ON
DELETE CASCADE,
  
  -- Identity & Bank (Step 1)
  owner_full_name VARCHAR(255),
  government_id_type VARCHAR
(50),
  government_id_number VARCHAR
(100),
  government_id_document_url TEXT,
  proof_of_address_document_url TEXT,
  bank_name VARCHAR
(255),
  account_holder_name VARCHAR
(255),
  account_number VARCHAR
(100),
  routing_number VARCHAR
(50),
  swift_code VARCHAR
(50),
  
  -- Business & Operations (Step 2)
  legal_business_name VARCHAR
(255),
  business_registration_number VARCHAR
(100),
  business_type VARCHAR
(100),
  business_tax_id VARCHAR
(100),
  establishment_year INTEGER,
  primary_business_address TEXT,
  warehouse_locations JSONB,
  business_phone VARCHAR
(20),
  business_email VARCHAR
(255),
  
  -- Documents (Step 3)
  business_license_url TEXT,
  certificate_of_incorporation_url TEXT,
  tax_registration_certificate_url TEXT,
  business_certificate_url TEXT,
  iso_certificate_url TEXT,
  quality_assurance_license_url TEXT,
  audit_reports_url TEXT,
  
  -- Status
  verification_status VARCHAR
(20) DEFAULT 'pending',
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMP,
  reviewed_by UUID REFERENCES users
(id),
  rejection_reason TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Create indexes for performance
CREATE INDEX
IF NOT EXISTS idx_user_roles_user_id ON user_roles
(user_id);
CREATE INDEX
IF NOT EXISTS idx_user_roles_active ON user_roles
(user_id, is_active);
CREATE INDEX
IF NOT EXISTS idx_user_roles_status ON user_roles
(verification_status);
CREATE INDEX
IF NOT EXISTS idx_supplier_verifications_user_id ON supplier_verifications
(user_id);
CREATE INDEX
IF NOT EXISTS idx_supplier_verifications_status ON supplier_verifications
(verification_status);

-- 5. Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column
()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Create triggers
DROP TRIGGER IF EXISTS update_user_roles_updated_at
ON user_roles;
CREATE TRIGGER update_user_roles_updated_at
  BEFORE
UPDATE ON user_roles
  FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column
();

DROP TRIGGER IF EXISTS update_supplier_verifications_updated_at
ON supplier_verifications;
CREATE TRIGGER update_supplier_verifications_updated_at
  BEFORE
UPDATE ON supplier_verifications
  FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column
();

-- 7. Migrate existing users to new system
-- All existing users get buyer role by default (active)
INSERT INTO user_roles
    (user_id, role, is_active, verified_at)
SELECT id, 'buyer', true, CURRENT_TIMESTAMP
FROM users
WHERE NOT EXISTS (
  SELECT 1
FROM user_roles
WHERE user_roles.user_id = users.id AND user_roles.role = 'buyer'
);

-- If users table has role column with 'supplier', migrate those too
INSERT INTO user_roles
    (user_id, role, is_active, verified_at, verification_status)
SELECT id, 'supplier', true, CURRENT_TIMESTAMP, 'approved'
FROM users
WHERE role = 'supplier'
    AND NOT EXISTS (
  SELECT 1
    FROM user_roles
    WHERE user_roles.user_id = users.id AND user_roles.role = 'supplier'
);

COMMENT ON TABLE user_roles IS 'Stores multiple roles per user for buyer ↔ supplier flow';
COMMENT ON TABLE verification_drafts IS 'Auto-saves verification form progress';
COMMENT ON TABLE supplier_verifications IS 'Stores complete supplier verification submissions';
