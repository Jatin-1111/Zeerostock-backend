/**
 * Create Super Admin User Script
 * Creates the first super admin with manual credentials
 * Run this script ONCE during initial setup
 */

require('dotenv').config();
const { Client } = require('pg');
const bcrypt = require('bcryptjs');
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

async function createSuperAdmin() {
    const client = new Client({
        connectionString: databaseUrl,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    try {
        console.log('🔐 Creating Super Admin User...\n');
        console.log('This script will create the FIRST super admin account.');
        console.log('Super admins can create and manage other admin users.\n');

        await client.connect();
        console.log('✅ Connected to database\n');

        // Get admin details
        const firstName = await question('First Name: ');
        const lastName = await question('Last Name: ');
        const email = await question('Email: ');
        const password = await question('Password (min 8 characters): ');

        // Validate input
        if (!firstName || !lastName || !email || !password) {
            console.error('\n❌ Error: All fields are required');
            process.exit(1);
        }

        if (password.length < 8) {
            console.error('\n❌ Error: Password must be at least 8 characters');
            process.exit(1);
        }

        // Check if email already exists
        const emailCheck = await client.query(
            'SELECT id, business_email FROM users WHERE business_email = $1',
            [email]
        );

        if (emailCheck.rows.length > 0) {
            console.error(`\n❌ Error: User with email ${email} already exists`);
            process.exit(1);
        }

        // Check if any super admin already exists
        const superAdminCheck = await client.query(
            "SELECT id FROM users WHERE roles @> ARRAY['super_admin']::text[]"
        );

        if (superAdminCheck.rows.length > 0) {
            console.log('\n⚠️  Warning: A super admin already exists in the database!');
            const confirm = await question('Do you still want to create another super admin? (yes/no): ');

            if (confirm.toLowerCase() !== 'yes') {
                console.log('\n❌ Operation cancelled');
                process.exit(0);
            }
        }

        // Hash password
        console.log('\n🔄 Creating super admin account...');
        const passwordHash = await bcrypt.hash(password, 10);

        // Create super admin with adminId = SUPER1, SUPER2, etc.
        const adminIdQuery = await client.query(
            "SELECT admin_id FROM users WHERE admin_id LIKE 'SUPER%' ORDER BY admin_id DESC LIMIT 1"
        );

        let adminId = 'SUPER1';
        if (adminIdQuery.rows.length > 0) {
            const lastId = adminIdQuery.rows[0].admin_id;
            const num = parseInt(lastId.replace('SUPER', '')) + 1;
            adminId = `SUPER${num}`;
        }

        // Insert super admin
        const result = await client.query(
            `INSERT INTO users (
                admin_id,
                first_name,
                last_name,
                business_email,
                mobile,
                company_name,
                business_type,
                password_hash,
                roles,
                active_role,
                is_super_admin,
                is_first_login,
                is_verified,
                is_active,
                failed_login_attempts,
                account_locked,
                created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, ARRAY['admin']::text[], 'admin', true, false, true, true, 0, false, NOW())
            RETURNING id, admin_id, business_email, first_name, last_name, roles, is_super_admin`,
            [adminId, firstName, lastName, email, `ADMIN${Date.now()}`, 'Zeerostock Admin', 'admin', passwordHash]
        );

        const superAdmin = result.rows[0];

        console.log('\n✅ Super Admin created successfully!\n');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`   Admin ID:     ${superAdmin.admin_id}`);
        console.log(`   Name:         ${superAdmin.first_name} ${superAdmin.last_name}`);
        console.log(`   Email:        ${superAdmin.business_email}`);
        console.log(`   Role:         ${superAdmin.roles[0]}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        console.log('🎉 Setup complete!\n');
        console.log('📚 Next steps:');
        console.log('   1. Start the backend server: npm run dev');
        console.log('   2. Login at the admin panel with:');
        console.log(`      - Admin ID: ${superAdmin.admin_id}`);
        console.log('      - Password: [the password you entered]');
        console.log('   3. You can now create other admin users from the admin panel\n');

        await client.end();
        rl.close();

    } catch (error) {
        console.error('\n❌ Failed to create super admin:', error.message);
        console.error('Error details:', error);
        process.exit(1);
    }
}

// Handle script cancellation
rl.on('SIGINT', () => {
    console.log('\n\n❌ Operation cancelled');
    process.exit(0);
});

createSuperAdmin();
