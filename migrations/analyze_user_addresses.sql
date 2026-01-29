-- Force PostgreSQL to update table statistics and use the new index
ANALYZE user_addresses;

-- Verify the index exists
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'user_addresses' 
AND indexname = 'idx_user_addresses_user_lookup';
