/**
 * Migrate Admins from Users Table to Admins Table (Complete)
 * 1. Adds missing columns (admin_id, mobile, is_super_admin, etc.)
 * 2. Migrates all data
 */

require('dotenv').config();
const { Client } = require('pg');
const { createClient } = require('@supabase/supabase-js');

const databaseUrl = process.env.DATABASE_URL;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!databaseUrl || !supabaseUrl || !supabaseKey) {
    console.error('❌ Error: Missing env vars');
    process.exit(1);
}

// ... (imports)

async function migrateAdmins() {
    console.log('🔄 Starting Complete Admin Migration...');

    // A. UPDATE SCHEMA (Using PG Client)
    const pgClient = new Client({
        connectionString: databaseUrl,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    try {
        await pgClient.connect();
        console.log('🛠️ Connected to DB. Updating Schema...');

        await pgClient.query(`
            ALTER TABLE admins ADD COLUMN IF NOT EXISTS admin_id VARCHAR(50);
            ALTER TABLE admins ADD COLUMN IF NOT EXISTS mobile VARCHAR(50);
            ALTER TABLE admins ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT FALSE;
            ALTER TABLE admins ADD COLUMN IF NOT EXISTS is_first_login BOOLEAN DEFAULT TRUE;
            ALTER TABLE admins ADD COLUMN IF NOT EXISTS credentials_expire_at TIMESTAMPTZ;
            ALTER TABLE admins ADD COLUMN IF NOT EXISTS credentials_used BOOLEAN DEFAULT FALSE;
        `);
        console.log('✅ Schema updated successfully.');
    } catch (err) {
        console.error('❌ Schema update failed:', err.message);
        process.exit(1);
    } finally {
        await pgClient.end();
    }

    // Initialize Supabase AFTER schema update to ensure new columns are detected
    const supabase = createClient(supabaseUrl, supabaseKey);

    // B. MIGRATE DATA (Using Supabase Client)
    try {
        // Fetch admins
        // ...
        const { data: users, error: fetchError } = await supabase
            .from('users')
            .select('*')
            .or('roles.cs.{admin},roles.cs.{super_admin}');

        if (fetchError) throw fetchError;

        if (!users || users.length === 0) {
            console.log('⚠️ No admin users found.');
            return;
        }

        console.log(`Found ${users.length} admin users. Migrating...`);
        let successCount = 0;

        for (const user of users) {
            const email = user.business_email || user.email;

            // Name splitting logic
            const fullName = user.name || (user.first_name ? `${user.first_name} ${user.last_name || ''}` : 'Admin');
            const [firstName, ...lastNameParts] = fullName.split(' ');
            const lastName = lastNameParts.join(' ');

            const adminData = {
                id: user.id,
                first_name: user.first_name || firstName || 'Admin',
                last_name: user.last_name || lastName || '',
                email: email,
                mobile: user.mobile, // Now strictly migrated
                password_hash: user.password_hash,
                role: user.roles.includes('super_admin') ? 'super_admin' : 'admin',
                admin_id: user.admin_id, // Now migrated
                is_super_admin: user.is_super_admin || user.roles.includes('super_admin'), // Now migrated
                is_first_login: user.is_first_login,
                credentials_expire_at: user.credentials_expire_at,
                credentials_used: user.credentials_used,
                failed_login_attempts: user.failed_login_attempts || 0,
                account_locked: user.account_locked || false,
                lock_until: user.lock_until,
                last_login: user.last_login,
                created_at: user.created_at,
                updated_at: user.updated_at,
                is_active: true
            };

            // Remove undefined
            Object.keys(adminData).forEach(key => adminData[key] === undefined && delete adminData[key]);

            const { error: insertError } = await supabase
                .from('admins')
                .upsert(adminData, { onConflict: 'email' });

            if (insertError) {
                console.error(`❌ Failed ${email}:`, insertError.message);
            } else {
                console.log(`✅ Migrated ${email} (with admin_id: ${adminData.admin_id}, mobile: ${adminData.mobile})`);
                successCount++;
            }
        }

        console.log(`\n🎉 Complete! Successfully migrated ${successCount} admins with all fields.`);

    } catch (error) {
        console.error('Migration failed:', error);
    }
}

migrateAdmins();
