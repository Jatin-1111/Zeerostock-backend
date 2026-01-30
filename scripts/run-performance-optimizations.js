const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runOptimizations() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('🔄 Reading performance optimizations SQL file...');
        const sqlFile = path.join(__dirname, '../database/performance-optimizations.sql');
        const sql = fs.readFileSync(sqlFile, 'utf8');

        console.log('🔄 Executing performance optimizations...');
        await pool.query(sql);

        console.log('✅ Performance optimizations applied successfully!');
        console.log('\n📊 Indexes created:');
        console.log('  - idx_users_email_active');
        console.log('  - idx_users_mobile_active');
        console.log('  - Full text search indexes');
        console.log('  - Product and order indexes');

    } catch (error) {
        console.error('❌ Error applying optimizations:', error.message);
        throw error;
    } finally {
        await pool.end();
    }
}

runOptimizations();
