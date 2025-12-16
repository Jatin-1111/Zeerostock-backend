/**
 * Create Admin User Script
 * Grants admin role to specified user
 */

require('dotenv').config();
const { Client } = require('pg');

const databaseUrl = process.env.DATABASE_URL;
const adminEmail = process.env.ADMIN_EMAIL || 'rakshakphogat@gmail.com';

if (!databaseUrl) {
    console.error('❌ Error: DATABASE_URL not found in .env');
    process.exit(1);
}

async function createAdminUser() {
    const client = new Client({
        connectionString: databaseUrl,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('🔐 Creating admin user...\n');

        await client.connect();
        console.log('✅ Connected to database');

        // Check if user exists
        const userCheck = await client.query(
            'SELECT id, business_email, first_name, last_name, roles FROM users WHERE business_email = $1',
            [adminEmail]
        );

        if (userCheck.rows.length === 0) {
            console.error(`\n❌ Error: No user found with email: ${adminEmail}`);
            console.log('\nPlease ensure the user exists in the database first.');
            console.log('You can sign up at: http://localhost:3000/signup\n');
            process.exit(1);
        }

        const user = userCheck.rows[0];
        console.log(`\n👤 Found user: ${user.first_name} ${user.last_name} (${user.business_email})`);
        console.log(`   Current roles: ${user.roles || '[]'}`);

        // Check if user already has admin role
        if (user.roles && user.roles.includes('admin')) {
            console.log('\n⚠️  User already has admin role');
            await client.end();
            return;
        }

        // Update user with admin role (admin only - remove buyer/supplier roles)
        const updateResult = await client.query(
            `UPDATE users 
             SET roles = ARRAY['admin']::text[], 
                 active_role = 'admin'
             WHERE business_email = $1
             RETURNING id, business_email, roles, active_role`,
            [adminEmail]
        );

        if (updateResult.rows.length > 0) {
            const updatedUser = updateResult.rows[0];
            console.log('\n✅ Admin user created successfully!');
            console.log(`   Email: ${updatedUser.business_email}`);
            console.log(`   Roles: ${updatedUser.roles}`);
            console.log(`   Active Role: ${updatedUser.active_role}`);
            console.log('\n⚠️  NOTE: Admin role is exclusive - user cannot be buyer/supplier');
        }

        await client.end();

        console.log('\n🎉 Setup complete!\n');
        console.log('📚 Next steps:');
        console.log('   1. Start the backend server: npm run dev');
        console.log('   2. Login with admin credentials');
        console.log('   3. Test admin endpoints:\n');
        console.log('      GET  /api/admin/supplier-verifications/stats');
        console.log('      GET  /api/admin/supplier-verifications');
        console.log('      POST /api/admin/supplier-verifications/:id/approve');
        console.log('      POST /api/admin/supplier-verifications/:id/reject\n');

    } catch (error) {
        console.error('\n❌ Failed to create admin user:', error.message);
        console.error('Error details:', error);
        process.exit(1);
    }
}

createAdminUser();
