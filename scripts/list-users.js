/**
 * List Users Script
 * Shows all users in the database
 */

require('dotenv').config();
const { Client } = require('pg');

const databaseUrl = process.env.DATABASE_URL;

async function listUsers() {
    const client = new Client({
        connectionString: databaseUrl,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();

        const result = await client.query(
            `SELECT id, first_name, last_name, business_email, mobile, 
                    roles, active_role, is_verified, is_active, created_at
             FROM users 
             ORDER BY created_at DESC 
             LIMIT 10`
        );

        console.log('\n👥 Users in database:\n');

        if (result.rows.length === 0) {
            console.log('   No users found. Please sign up first.\n');
        } else {
            result.rows.forEach((user, index) => {
                console.log(`${index + 1}. ${user.first_name} ${user.last_name}`);
                console.log(`   Email: ${user.business_email}`);
                console.log(`   Phone: ${user.mobile || 'N/A'}`);
                console.log(`   Roles: ${user.roles || '[]'}`);
                console.log(`   Active Role: ${user.active_role || 'N/A'}`);
                console.log(`   Verified: ${user.is_verified ? 'Yes' : 'No'}`);
                console.log(`   Active: ${user.is_active ? 'Yes' : 'No'}`);
                console.log(`   Created: ${user.created_at}\n`);
            });

            console.log(`Total users: ${result.rows.length}\n`);
            console.log('To make a user admin, run:');
            console.log('   ADMIN_EMAIL=user@example.com node scripts/create-admin.js\n');
        }

        await client.end();

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

listUsers();
