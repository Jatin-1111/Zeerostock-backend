/**
 * Reset Super Admin Password
 * Updates the password for an existing super admin
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
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

async function resetSuperAdminPassword() {
    const client = new Client({
        connectionString: databaseUrl,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    try {
        await client.connect();
        console.log('✅ Connected to database\n');

        // Get super admin details
        const result = await client.query(
            `SELECT 
                id, admin_id, first_name, last_name, business_email, 
                is_super_admin, is_active
             FROM users 
             WHERE admin_id = 'SUPER1'`
        );

        if (result.rows.length === 0) {
            console.log('❌ No super admin found with admin_id = SUPER1');
            process.exit(1);
        }

        const user = result.rows[0];
        console.log('📋 Found Super Admin:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`   Admin ID:    ${user.admin_id}`);
        console.log(`   Name:        ${user.first_name} ${user.last_name}`);
        console.log(`   Email:       ${user.business_email}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        // Get new password
        const newPassword = await question('Enter new password (min 8 characters): ');
        const confirmPassword = await question('Confirm new password: ');

        // Validate passwords
        if (!newPassword || newPassword.length < 8) {
            console.error('\n❌ Error: Password must be at least 8 characters');
            process.exit(1);
        }

        if (newPassword !== confirmPassword) {
            console.error('\n❌ Error: Passwords do not match');
            process.exit(1);
        }

        // Hash new password
        console.log('\n🔄 Updating password...');
        const passwordHash = await bcrypt.hash(newPassword, parseInt(process.env.BCRYPT_SALT_ROUNDS || 12));

        // Update password and reset login attempts
        await client.query(
            `UPDATE users 
             SET password_hash = $1,
                 failed_login_attempts = 0,
                 account_locked = false,
                 is_first_login = false,
                 updated_at = NOW()
             WHERE id = $2`,
            [passwordHash, user.id]
        );

        console.log('\n✅ Password updated successfully!\n');
        console.log('🔐 You can now login with:');
        console.log(`   - Admin ID: ${user.admin_id}`);
        console.log('   - Password: [the new password you just set]\n');

        await client.end();
        rl.close();

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        process.exit(1);
    }
}

resetSuperAdminPassword();
