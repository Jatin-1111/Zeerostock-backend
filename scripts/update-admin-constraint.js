/**
 * Update Migration Script
 * Adds admin exclusive constraint
 */

require('dotenv').config();
const { Client } = require('pg');

const databaseUrl = process.env.DATABASE_URL;

async function updateMigration() {
    const client = new Client({
        connectionString: databaseUrl,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('🔄 Updating database constraints...\n');

        await client.connect();
        console.log('✅ Connected to database\n');

        // First, update existing admin users to have only admin role
        console.log('📝 Updating existing admin users to exclusive admin role...');
        const result = await client.query(`
            UPDATE users 
            SET roles = ARRAY['admin']::text[],
                active_role = 'admin'
            WHERE 'admin' = ANY(roles)
            RETURNING business_email, roles;
        `);

        if (result.rows.length > 0) {
            console.log(`✅ Updated ${result.rows.length} admin user(s):`);
            result.rows.forEach(user => {
                console.log(`   - ${user.business_email}: ${user.roles}`);
            });
        } else {
            console.log('   No admin users found to update');
        }

        // Remove buyer profiles for admin users
        console.log('\n📝 Cleaning up buyer profiles for admin users...');
        const deleteResult = await client.query(`
            DELETE FROM buyer_profiles
            WHERE user_id IN (
                SELECT id FROM users WHERE 'admin' = ANY(roles)
            )
            RETURNING user_id;
        `);

        if (deleteResult.rows.length > 0) {
            console.log(`✅ Removed ${deleteResult.rows.length} buyer profile(s) for admin users`);
        } else {
            console.log('   No buyer profiles to remove');
        }

        // Now add constraint - admin must be exclusive
        console.log('\n📝 Adding admin exclusive constraint...');
        await client.query(`
            ALTER TABLE users 
            DROP CONSTRAINT IF EXISTS admin_exclusive_role;
        `);

        await client.query(`
            ALTER TABLE users 
            ADD CONSTRAINT admin_exclusive_role 
            CHECK (
                (NOT ('admin' = ANY(roles)) OR (roles = ARRAY['admin']))
            );
        `);
        console.log('✅ Admin exclusive constraint added\n');

        await client.end();

        console.log('\n🎉 Migration update complete!\n');
        console.log('✅ Admin role is now exclusive');
        console.log('✅ Admins cannot be buyers or suppliers');
        console.log('✅ Database constraints enforced\n');

    } catch (error) {
        console.error('\n❌ Update failed:', error.message);
        if (error.message.includes('violates check constraint')) {
            console.log('\n⚠️  There are users with admin + other roles.');
            console.log('   The constraint prevents admins from having buyer/supplier roles.');
            console.log('   This is the intended behavior.\n');
        }
        process.exit(1);
    }
}

updateMigration();
