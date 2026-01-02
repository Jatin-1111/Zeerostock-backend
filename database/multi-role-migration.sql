-- =====================================================
-- ZEEROSTOCK MULTI-ROLE MIGRATION
-- Migration to support Buyer & Supplier roles
-- =====================================================

-- Step 1: Add new columns to users table
ALTER TABLE users 
  ADD COLUMN
IF NOT EXISTS roles TEXT[] DEFAULT ARRAY['buyer'],
ADD COLUMN
IF NOT EXISTS active_role VARCHAR
(20) DEFAULT 'buyer',
ADD COLUMN
IF NOT EXISTS role_preferences JSONB DEFAULT '{}';

-- Step 2: Migrate existing role column to roles array
UPDATE users 
SET roles = ARRAY[role]
WHERE role IS NOT NULL AND roles IS NULL;

-- Step 3: Add constraints for valid roles
ALTER TABLE users 
  DROP CONSTRAINT IF EXISTS valid_roles
,
ADD CONSTRAINT valid_roles 
  CHECK
(roles <@ ARRAY['buyer', 'supplier', 'admin', 'super_admin']);

-- Step 4: Add constraint to ensure active role is in roles array
ALTER TABLE users 
  DROP CONSTRAINT IF EXISTS active_role_valid
,
ADD CONSTRAINT active_role_valid 
  CHECK
(active_role = ANY
(roles));

-- Step 5: Add constraint - admin must be exclusive (cannot have buyer/supplier roles)
ALTER TABLE users 
  DROP CONSTRAINT IF EXISTS admin_exclusive_role
,
ADD CONSTRAINT admin_exclusive_role 
  CHECK
(
    (NOT
('admin' = ANY
(roles)) OR
(roles = ARRAY['admin']))
  );

-- Step 6: Create buyer profiles table
CREATE TABLE
IF NOT EXISTS buyer_profiles
(
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4
(),
    user_id UUID NOT NULL REFERENCES users
(id) ON
DELETE CASCADE,
    company_name VARCHAR(255),
    industry VARCHAR
(100),
    preferred_categories TEXT[],
    budget_range VARCHAR
(50),
    verified_buyer BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP
WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE
(user_id)
);

-- Step 7: Create supplier profiles table with verification
CREATE TABLE
IF NOT EXISTS supplier_profiles
(
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4
(),
    user_id UUID NOT NULL REFERENCES users
(id) ON
DELETE CASCADE,
    business_name VARCHAR(255)
NOT NULL,
    business_type VARCHAR
(50) NOT NULL,
    gst_number VARCHAR
(15),
    pan_number VARCHAR
(10),
    warehouse_locations TEXT[],
    product_categories TEXT[],
    business_address TEXT,
    business_email VARCHAR
(255),
    business_phone VARCHAR
(15),
    
    -- Verification fields
    verification_status VARCHAR
(20) DEFAULT 'pending' CHECK
(verification_status IN
('pending', 'under_review', 'verified', 'rejected')),
    verification_notes TEXT,
    verified_by UUID REFERENCES users
(id),
    verified_at TIMESTAMP
WITH TIME ZONE,
    rejection_reason TEXT,
    
    -- Document uploads (store file URLs)
    gst_certificate_url TEXT,
    pan_card_url TEXT,
    business_license_url TEXT,
    address_proof_url TEXT,
    
    rating DECIMAL
(3,2) DEFAULT 0,
    total_sales INTEGER DEFAULT 0,
    created_at TIMESTAMP
WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE
(user_id)
);

-- Step 8: Create verification history table for audit trail
CREATE TABLE
IF NOT EXISTS supplier_verification_history
(
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4
(),
    supplier_profile_id UUID NOT NULL REFERENCES supplier_profiles
(id) ON
DELETE CASCADE,
    status VARCHAR(20)
NOT NULL,
    notes TEXT,
    changed_by UUID REFERENCES users
(id),
    changed_at TIMESTAMP
WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Step 9: Add indexes for performance
CREATE INDEX
IF NOT EXISTS idx_users_roles ON users USING GIN
(roles);
CREATE INDEX
IF NOT EXISTS idx_users_active_role ON users
(active_role);
CREATE INDEX
IF NOT EXISTS idx_buyer_profiles_user ON buyer_profiles
(user_id);
CREATE INDEX
IF NOT EXISTS idx_supplier_profiles_user ON supplier_profiles
(user_id);
CREATE INDEX
IF NOT EXISTS idx_supplier_verification_status ON supplier_profiles
(verification_status);
CREATE INDEX
IF NOT EXISTS idx_supplier_verification_history_profile ON supplier_verification_history
(supplier_profile_id);

-- Step 10: Create trigger function for updating updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column
()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
RETURN NEW;
END;
$$ language 'plpgsql';

-- Step 11: Create triggers
DROP TRIGGER IF EXISTS update_buyer_profiles_updated_at
ON buyer_profiles;
CREATE TRIGGER update_buyer_profiles_updated_at 
    BEFORE
UPDATE ON buyer_profiles
    FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column
();

DROP TRIGGER IF EXISTS update_supplier_profiles_updated_at
ON supplier_profiles;
CREATE TRIGGER update_supplier_profiles_updated_at 
    BEFORE
UPDATE ON supplier_profiles
    FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column
();

-- Step 12: Create initial buyer profiles for existing users (exclude admins)
INSERT INTO buyer_profiles
  (user_id, company_name)
SELECT id, company_name
FROM users
WHERE id NOT IN (SELECT user_id
  FROM buyer_profiles)
  AND NOT ('admin' = ANY(roles)
);

-- Step 13: Grant necessary permissions (if using RLS)
-- ALTER TABLE buyer_profiles ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE supplier_profiles ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE supplier_verification_history ENABLE ROW LEVEL SECURITY;

-- Step 14: Create view for easy user profile lookup
CREATE OR REPLACE VIEW user_profiles_view AS
SELECT
  u.id,
  u.first_name,
  u.last_name,
  u.business_email,
  u.mobile,
  u.roles,
  u.active_role,
  u.is_verified,
  u.is_active,
  bp.company_name as buyer_company,
  bp.industry as buyer_industry,
  bp.verified_buyer,
  sp.business_name as supplier_business,
  sp.business_type as supplier_type,
  sp.verification_status as supplier_verification_status,
  sp.rating as supplier_rating
FROM users u
  LEFT JOIN buyer_profiles bp ON u.id = bp.user_id
  LEFT JOIN supplier_profiles sp ON u.id = sp.user_id;

-- Completion message
DO $$ 
BEGIN 
    RAISE NOTICE 'Multi-role migration completed successfully!';
END $$;
