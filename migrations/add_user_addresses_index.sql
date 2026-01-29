-- Add index to optimize user_addresses queries
-- This index will speed up the getByUserId query which filters by user_id
-- and orders by is_default and created_at

CREATE INDEX IF NOT EXISTS idx_user_addresses_user_lookup 
ON user_addresses(user_id, is_default DESC, created_at DESC);

-- This composite index will help with:
-- 1. Fast filtering by user_id
-- 2. Efficient ordering by is_default (DESC) to get default addresses first
-- 3. Secondary ordering by created_at (DESC) for most recent addresses
