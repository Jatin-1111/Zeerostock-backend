/**
 * Convert Existing User to Super Admin
 * Upgrades an existing user account to super admin role
 */

require('dotenv').config();
const { Client } = require('pg');
const readline = require('readline');

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
    console.error('❌ Error: DATABASE_URL not found in .env');
    process.exit(1);
}

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(query) {
    return new Promise((resolve) => {
        rl.question(query, resolve);
    });
}

async function makeUserSuperAdmin() {
    const client = new Client({
        connectionString: databaseUrl,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    try {
        console.log('🔐 Convert User to Super Admin...\n');

        await client.connect();
        console.log('✅ Connected to database\n');

        // Get user email
        const email = await question('Enter user email: ');

        // Check if user exists
        const userCheck = await client.query(
            'SELECT id, business_email, first_name, last_name, roles, admin_id FROM users WHERE business_email = $1',
            [email]
        );

        if (userCheck.rows.length === 0) {
            console.error(`\n❌ Error: No user found with email: ${email}`);
            console.log('Please check the email and try again.\n');
            process.exit(1);
        }

        const user = userCheck.rows[0];
        console.log(`\n👤 Found user: ${user.first_name} ${user.last_name} (${user.business_email})`);
        console.log(`   Current roles: ${user.roles || '[]'}`);
        console.log(`   Admin ID: ${user.admin_id || 'Not set'}`);

        // Check if user already has super_admin role
        if (user.roles && user.roles.includes('super_admin')) {
            console.log('\n✅ User is already a super admin!');
            await client.end();
            rl.close();
            return;
        }

        // Confirm action
        console.log('\n⚠️  This will:');
        console.log('   1. Set user role to super_admin');
        console.log('   2. Generate an admin ID if not present');
        console.log('   3. Remove buyer/supplier roles (admins cannot be buyers/suppliers)');
        console.log('   4. Set is_first_login to false (no password reset required)\n');

        const confirm = await question('Continue? (yes/no): ');

        if (confirm.toLowerCase() !== 'yes') {
            console.log('\n❌ Operation cancelled');
            process.exit(0);
        }

        // Generate admin ID if user doesn't have one
        let adminId = user.admin_id;
        if (!adminId) {
            const adminIdQuery = await client.query(
                "SELECT admin_id FROM users WHERE admin_id LIKE 'SUPER%' ORDER BY admin_id DESC LIMIT 1"
            );

            if (adminIdQuery.rows.length > 0) {
                const lastId = adminIdQuery.rows[0].admin_id;
                const num = parseInt(lastId.replace('SUPER', '')) + 1;
                adminId = `SUPER${num}`;
            } else {
                adminId = 'SUPER1';
            }
        }

        // Update user to super admin
        console.log('\n🔄 Updating user to super admin...');

        const result = await client.query(
            `UPDATE users 
             SET roles = ARRAY['super_admin']::text[],
                 admin_id = $1,
                 is_first_login = false,
                 is_verified = true,
                 is_active = true
             WHERE business_email = $2
             RETURNING id, admin_id, business_email, first_name, last_name, roles`,
            [adminId, email]
        );

        const updatedUser = result.rows[0];

        console.log('\n✅ User converted to Super Admin successfully!\n');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`   Admin ID:     ${updatedUser.admin_id}`);
        console.log(`   Name:         ${updatedUser.first_name} ${updatedUser.last_name}`);
        console.log(`   Email:        ${updatedUser.business_email}`);
        console.log(`   Role:         ${updatedUser.roles[0]}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        console.log('🎉 Setup complete!\n');
        console.log('📚 Next steps:');
        console.log('   1. Login at the admin panel with:');
        console.log(`      - Admin ID: ${updatedUser.admin_id}`);
        console.log(`      - OR Email: ${updatedUser.business_email}`);
        console.log('      - Password: [your current password]');
        console.log('   2. You can now create other admin users from the admin panel\n');

        await client.end();
        rl.close();

    } catch (error) {
        console.error('\n❌ Failed to convert user to super admin:', error.message);
        console.error('Error details:', error);
        process.exit(1);
    }
}

// Handle script cancellation
rl.on('SIGINT', () => {
    console.log('\n\n❌ Operation cancelled');
    process.exit(0);
});

makeUserSuperAdmin();
