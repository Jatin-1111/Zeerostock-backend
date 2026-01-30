const { Pool } = require('pg');
require('dotenv').config();

async function diagnosePerformance() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('🔍 Database Performance Diagnostics\n');

        // Test 1: Query latency
        console.log('Test 1: Query Latency');
        const queryStart = Date.now();
        const result = await pool.query('SELECT 1');
        console.log(`✓ Simple query: ${Date.now() - queryStart}ms\n`);

        // Test 2: User lookup with index
        console.log('Test 2: User Lookup (with index)');
        const userStart = Date.now();
        const userResult = await pool.query(
            'SELECT id, business_email, is_verified, is_active FROM users WHERE business_email = $1 LIMIT 1',
            ['off.jatin1111@gmail.com']
        );
        console.log(`✓ User lookup: ${Date.now() - userStart}ms`);
        console.log(`✓ Found: ${userResult.rows.length} user(s)\n`);

        // Test 3: Role lookup with index
        console.log('Test 3: Role Lookup (with index)');
        if (userResult.rows.length > 0) {
            const userId = userResult.rows[0].id;
            const roleStart = Date.now();
            const roleResult = await pool.query(
                'SELECT role FROM user_roles WHERE user_id = $1 AND is_active = true',
                [userId]
            );
            console.log(`✓ Role lookup: ${Date.now() - roleStart}ms`);
            console.log(`✓ Found: ${roleResult.rows.length} role(s)\n`);
        }

        // Test 4: Connection pool info
        console.log('Test 4: Connection Pool Status');
        console.log(`✓ Pool size: ${pool.totalCount} connections`);
        console.log(`✓ Idle connections: ${pool.idleCount}`);
        console.log(`✓ Waiting requests: ${pool.waitingCount}\n`);

        // Test 5: Index check
        console.log('Test 5: Index Status');
        const indexResult = await pool.query(`
            SELECT indexname, indexdef
            FROM pg_indexes
            WHERE tablename IN ('users', 'user_roles')
            ORDER BY tablename, indexname
        `);
        console.log('✓ Indexes found:');
        indexResult.rows.forEach(idx => {
            if (idx.indexname.includes('email') || idx.indexname.includes('mobile') || idx.indexname.includes('user_roles')) {
                console.log(`  ✓ ${idx.indexname}`);
            }
        });

        console.log('\n📊 Analysis:');
        console.log('If queries are >200ms, the issue is:');
        console.log('  - Network latency to Supabase (check region)');
        console.log('  - Connection pooling mode (pgbouncer transaction mode)');
        console.log('  - Database server load\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

diagnosePerformance();
