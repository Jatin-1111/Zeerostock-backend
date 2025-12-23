-- Admin Authentication System Migration
-- Adds required columns for admin user management

-- Add admin authentication columns
ALTER TABLE users 
ADD COLUMN
IF NOT EXISTS admin_id VARCHAR
(6) UNIQUE,
ADD COLUMN
IF NOT EXISTS is_super_admin BOOLEAN DEFAULT false,
ADD COLUMN
IF NOT EXISTS is_first_login BOOLEAN DEFAULT false,
ADD COLUMN
IF NOT EXISTS credentials_expire_at TIMESTAMP,
ADD COLUMN
IF NOT EXISTS credentials_used BOOLEAN DEFAULT false,
ADD COLUMN
IF NOT EXISTS account_locked BOOLEAN DEFAULT false,
ADD COLUMN
IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0,
ADD COLUMN
IF NOT EXISTS lock_until TIMESTAMP,
ADD COLUMN
IF NOT EXISTS last_password_change TIMESTAMP;

-- Create index on admin_id for faster lookups
CREATE INDEX
IF NOT EXISTS idx_users_admin_id ON users
(admin_id);

-- Create index on account_locked for filtering locked accounts
CREATE INDEX
IF NOT EXISTS idx_users_account_locked ON users
(account_locked);

-- Create index on credentials_expire_at for expiry checks
CREATE INDEX
IF NOT EXISTS idx_users_credentials_expire ON users
(credentials_expire_at);

-- Update existing users to have default values
UPDATE users 
SET 
    is_super_admin = false,
    is_first_login = false,
    account_locked = false,
    failed_login_attempts = 0,
    credentials_used = false
WHERE is_first_login IS NULL;

SELECT 'Admin authentication migration completed successfully!' AS status;
