/**
 * Database Migration Script
 * Executes multi-role migration for Zeerostock
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Error: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not found in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
    try {
        console.log('🚀 Starting multi-role migration...\n');

        // Read migration file
        const migrationPath = path.join(__dirname, '../database/multi-role-migration.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        console.log('📄 Migration file loaded successfully');
        console.log('📝 Executing SQL commands...\n');

        // Execute the migration using Supabase SQL API
        const { data, error } = await supabase.rpc('exec_sql', {
            sql_query: migrationSQL
        });

        if (error) {
            // If exec_sql doesn't exist, we'll need to use the SQL editor approach
            console.log('⚠️  Direct SQL execution not available via API');
            console.log('\n📋 Please follow these manual steps:\n');
            console.log('1. Open Supabase Dashboard: https://supabase.com/dashboard');
            console.log(`2. Navigate to your project: ${supabaseUrl}`);
            console.log('3. Go to SQL Editor');
            console.log('4. Copy the contents from: database/multi-role-migration.sql');
            console.log('5. Paste and execute in the SQL editor\n');
            console.log('Migration SQL file location:');
            console.log(`   ${migrationPath}\n`);

            // Let's try an alternative approach - execute via PostgreSQL connection
            console.log('🔄 Attempting alternative migration method...\n');
            await runMigrationViaPostgres(migrationSQL);
            return;
        }

        console.log('✅ Migration executed successfully!\n');

        // Verify migration
        await verifyMigration();

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error('\nFull error:', error);
        process.exit(1);
    }
}

async function runMigrationViaPostgres(migrationSQL) {
    const { Client } = require('pg');
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
        throw new Error('DATABASE_URL not found in .env');
    }

    let client;

    try {
        console.log('📡 Connecting to PostgreSQL...');
        client = new Client({
            connectionString: databaseUrl,
            ssl: { rejectUnauthorized: false }
        });

        await client.connect();
        console.log('✅ Connected to database\n');

        console.log('📝 Executing migration SQL as a single transaction...\n');

        // Execute the entire SQL file as one query within a transaction
        // PostgreSQL can handle complex statements including functions, triggers, and DO blocks
        await client.query('BEGIN');

        try {
            await client.query(migrationSQL);
            await client.query('COMMIT');
            console.log('✅ Migration executed successfully!\n');
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        }

        await client.end();

        // Verify migration
        await verifyMigration();

    } catch (error) {
        if (client) {
            try {
                await client.end();
            } catch (e) {
                // Ignore cleanup errors
            }
        }

        console.error('\n❌ PostgreSQL migration failed:', error.message);
        console.error('Error details:', error);

        console.log('\n📋 Manual Migration Instructions:\n');
        console.log('1. Open Supabase Dashboard: https://supabase.com/dashboard');
        console.log('2. Go to SQL Editor');
        console.log('3. Copy and paste the contents of: database/multi-role-migration.sql');
        console.log('4. Click "Run" to execute\n');
        process.exit(1);
    }
}

async function verifyMigration() {
    console.log('🔍 Verifying migration...\n');

    try {
        // Check if roles column exists
        const { data: rolesCheck, error: rolesError } = await supabase
            .from('users')
            .select('roles, active_role')
            .limit(1);

        if (rolesError) {
            console.log('   ⚠️  Could not verify users table updates');
        } else {
            console.log('   ✅ Users table: roles and active_role columns exist');
        }

        // Check if buyer_profiles table exists
        const { data: buyerCheck, error: buyerError } = await supabase
            .from('buyer_profiles')
            .select('id')
            .limit(1);

        if (buyerError) {
            console.log('   ⚠️  buyer_profiles table verification failed');
        } else {
            console.log('   ✅ buyer_profiles table exists');
        }

        // Check if supplier_profiles table exists
        const { data: supplierCheck, error: supplierError } = await supabase
            .from('supplier_profiles')
            .select('id')
            .limit(1);

        if (supplierError) {
            console.log('   ⚠️  supplier_profiles table verification failed');
        } else {
            console.log('   ✅ supplier_profiles table exists');
        }

        // Check if verification history table exists
        const { data: historyCheck, error: historyError } = await supabase
            .from('supplier_verification_history')
            .select('id')
            .limit(1);

        if (historyError) {
            console.log('   ⚠️  supplier_verification_history table verification failed');
        } else {
            console.log('   ✅ supplier_verification_history table exists');
        }

        console.log('\n🎉 Migration verification complete!\n');
        console.log('📚 Next steps:');
        console.log('   1. Create an admin user (see below)');
        console.log('   2. Test the API endpoints');
        console.log('   3. Implement frontend components\n');

        console.log('🛡️  To create an admin user, run this SQL in Supabase:');
        console.log(`
UPDATE users 
SET roles = ARRAY['buyer', 'admin'], 
    active_role = 'admin'
WHERE business_email = 'your-admin-email@example.com';
        `);

    } catch (error) {
        console.log('   ⚠️  Verification encountered issues:', error.message);
    }
}

// Run migration
runMigration();
