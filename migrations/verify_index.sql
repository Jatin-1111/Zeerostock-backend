-- Verify the index was created
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'user_addresses'
ORDER BY indexname;

-- Check if the index is being used in queries
EXPLAIN ANALYZE
SELECT *
FROM user_addresses
WHERE user_id = 'some-user-id'
ORDER BY is_default DESC, created_at DESC;
