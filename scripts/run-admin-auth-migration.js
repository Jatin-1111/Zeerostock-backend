/**
 * Run Admin Authentication Migration
 * Adds required columns to users table for admin system
 */

require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
    console.error('❌ Error: DATABASE_URL not found in .env');
    process.exit(1);
}

async function runMigration() {
    const client = new Client({
        connectionString: databaseUrl,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    try {
        console.log('🔄 Running Admin Authentication Migration...\n');

        await client.connect();
        console.log('✅ Connected to database');

        // Read the migration SQL file
        const migrationPath = path.join(__dirname, '../database/admin-auth-migration.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        console.log('📄 Executing migration script...');

        // Execute the migration
        const result = await client.query(migrationSQL);

        console.log('\n✅ Migration completed successfully!');
        console.log('\n📊 Changes applied:');
        console.log('   • Added admin_id column (VARCHAR(6), UNIQUE)');
        console.log('   • Added is_super_admin column (BOOLEAN)');
        console.log('   • Added is_first_login column (BOOLEAN)');
        console.log('   • Added credentials_expire_at column (TIMESTAMP)');
        console.log('   • Added credentials_used column (BOOLEAN)');
        console.log('   • Added account_locked column (BOOLEAN)');
        console.log('   • Added failed_login_attempts column (INTEGER)');
        console.log('   • Added lock_until column (TIMESTAMP)');
        console.log('   • Added last_password_change column (TIMESTAMP)');
        console.log('   • Created performance indexes');
        console.log('   • Updated existing users with default values\n');

        console.log('🎉 You can now run create-super-admin.js to create your first super admin!\n');

        await client.end();

    } catch (error) {
        console.error('\n❌ Migration failed:', error.message);

        if (error.code === '42701') {
            console.log('\n⚠️  Column already exists. Migration may have already been run.');
        } else if (error.code === '42P07') {
            console.log('\n⚠️  Index already exists. Migration may have already been run.');
        } else {
            console.error('Error details:', error);
        }

        process.exit(1);
    }
}

runMigration();
