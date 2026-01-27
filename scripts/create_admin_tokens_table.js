const { query, pool } = require('../src/config/database');

async function createAdminRefreshTokensTable() {
    try {
        console.log('Starting migration: create admin_refresh_tokens table...');

        const sql = `
            CREATE TABLE IF NOT EXISTS admin_refresh_tokens (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                admin_id UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
                token TEXT NOT NULL UNIQUE,
                expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                revoked BOOLEAN DEFAULT FALSE
            );

            CREATE INDEX IF NOT EXISTS idx_admin_refresh_tokens_admin_id ON admin_refresh_tokens(admin_id);
            CREATE INDEX IF NOT EXISTS idx_admin_refresh_tokens_token ON admin_refresh_tokens(token);
        `;

        await query(sql);
        console.log('✓ Successfully created admin_refresh_tokens table and indexes');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await pool.end();
    }
}

createAdminRefreshTokensTable();
