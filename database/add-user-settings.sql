-- Add settings columns to users table for buyer settings functionality
-- This migration adds JSONB columns for flexible settings storage

-- Add notification preferences column
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{
  "email": true,
  "sms": false,
  "push": true,
  "marketing": true,
  "digest": false,
  "alerts": true
}'::jsonb;

-- Add privacy settings column
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS privacy_settings JSONB DEFAULT '{
  "dataSharing": true,
  "analytics": true
}'::jsonb;

-- Add language and regional preferences
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS language VARCHAR(50) DEFAULT 'English';

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS region VARCHAR(100) DEFAULT 'United States';

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS date_format VARCHAR(20) DEFAULT 'MM/DD/YYYY';

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS time_format VARCHAR(20) DEFAULT '12-hour';

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'USD';

-- Add bio field for account settings
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS bio TEXT;

-- Add address fields (these might already exist)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS street VARCHAR(255);

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS city VARCHAR(100);

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS state VARCHAR(100);

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS zip VARCHAR(20);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_language ON users(language);

-- Comment on columns
COMMENT ON COLUMN users.notification_preferences IS 'JSONB storing user notification preferences (email, sms, push, marketing, digest, alerts)';
COMMENT ON COLUMN users.privacy_settings IS 'JSONB storing privacy settings (dataSharing, analytics)';
COMMENT ON COLUMN users.language IS 'User interface language preference';
COMMENT ON COLUMN users.region IS 'User regional setting';
COMMENT ON COLUMN users.date_format IS 'Preferred date format (MM/DD/YYYY, DD/MM/YYYY, etc.)';
COMMENT ON COLUMN users.time_format IS 'Preferred time format (12-hour, 24-hour)';
COMMENT ON COLUMN users.currency IS 'Preferred currency code (USD, EUR, INR, etc.)';
