/**
 * Check Super Admin Details
 */

require('dotenv').config();
const { Client } = require('pg');

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
    console.error('❌ Error: DATABASE_URL not found in .env');
    process.exit(1);
}

async function checkSuperAdmin() {
    const client = new Client({
        connectionString: databaseUrl,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    try {
        await client.connect();
        console.log('✅ Connected to database\n');

        // Check super admin user
        const result = await client.query(
            `SELECT 
                id, admin_id, first_name, last_name, business_email, 
                roles, active_role, is_super_admin, is_active, is_verified
             FROM users 
             WHERE admin_id = 'SUPER1'`
        );

        if (result.rows.length === 0) {
            console.log('❌ No super admin found with admin_id = SUPER1');
        } else {
            const user = result.rows[0];
            console.log('📋 Super Admin Details:');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log(`ID:              ${user.id}`);
            console.log(`Admin ID:        ${user.admin_id}`);
            console.log(`Name:            ${user.first_name} ${user.last_name}`);
            console.log(`Email:           ${user.business_email}`);
            console.log(`Roles:           ${JSON.stringify(user.roles)}`);
            console.log(`Active Role:     ${user.active_role}`);
            console.log(`Is Super Admin:  ${user.is_super_admin}`);
            console.log(`Is Active:       ${user.is_active}`);
            console.log(`Is Verified:     ${user.is_verified}`);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

            if (!user.is_super_admin) {
                console.log('⚠️  WARNING: is_super_admin is FALSE!');
                console.log('   This user will NOT have super admin privileges.\n');

                console.log('Would you like to fix this? Run:');
                console.log('   node scripts/make-user-super-admin.js\n');
            } else {
                console.log('✅ User is correctly set as super admin!');
            }
        }

        await client.end();

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        process.exit(1);
    }
}

checkSuperAdmin();
