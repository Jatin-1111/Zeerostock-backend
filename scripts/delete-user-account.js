/**
 * Delete User Account Script
 * Removes all account details and related data for a specific email address
 * 
 * Usage: EMAIL=user@example.com node scripts/delete-user-account.js
 * For contactjatin0111@gmail.com: EMAIL=contactjatin0111@gmail.com node scripts/delete-user-account.js
 */

require('dotenv').config();
const { Client } = require('pg');

const targetEmail = process.env.EMAIL || 'contactjatin0111@gmail.com';
const databaseUrl = process.env.DATABASE_URL;

async function deleteUserAccount() {
    const client = new Client({
        connectionString: databaseUrl,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('\n🔍 Starting account deletion process...\n');

        // First, find the user
        const userQuery = await client.query(
            'SELECT id, first_name, last_name, business_email, company_name, roles, created_at FROM users WHERE business_email = $1',
            [targetEmail]
        );

        if (userQuery.rows.length === 0) {
            console.log(`❌ No user found with email: ${targetEmail}\n`);
            return;
        }

        const user = userQuery.rows[0];
        const userId = user.id;

        console.log('📋 User Details:');
        console.log(`   Name: ${user.first_name} ${user.last_name}`);
        console.log(`   Email: ${user.business_email}`);
        console.log(`   Company: ${user.company_name}`);
        console.log(`   Roles: ${user.roles || '[]'}`);
        console.log(`   User ID: ${userId}`);
        console.log(`   Created: ${user.created_at}\n`);

        // Ask for confirmation
        console.log('⚠️  WARNING: This will permanently delete ALL data associated with this account!\n');
        console.log('This includes:');
        console.log('   • User profile and authentication data');
        console.log('   • Orders and order items');
        console.log('   • RFQs and quotes');
        console.log('   • Cart and saved items');
        console.log('   • Reviews and ratings');
        console.log('   • Notifications');
        console.log('   • Payment methods');
        console.log('   • Supplier verification data');
        console.log('   • Feedback and bug reports');
        console.log('   • All other related records\n');

        // For safety, require manual confirmation
        const readline = require('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        const confirmed = await new Promise((resolve) => {
            rl.question(`Type 'DELETE ${targetEmail}' to confirm: `, (answer) => {
                rl.close();
                resolve(answer === `DELETE ${targetEmail}`);
            });
        });

        if (!confirmed) {
            console.log('\n❌ Deletion cancelled. No changes were made.\n');
            return;
        }

        console.log('\n🗑️  Starting deletion...\n');

        let deletionStats = {};

        // Helper function to safely delete from a table
        const safeDelete = async (tableName, query, params) => {
            try {
                const result = await client.query(query, params);
                const count = result.rowCount || 0;
                if (count > 0) {
                    deletionStats[tableName] = count;
                }
                return count;
            } catch (error) {
                // If table doesn't exist, skip it silently
                if (error.code === '42P01') {
                    console.log(`   ⚠️  Skipping ${tableName} (table does not exist)`);
                    return 0;
                }
                // Log error but continue with other deletions
                console.log(`   ⚠️  Error deleting from ${tableName}: ${error.message}`);
                return 0;
            }
        };

        // Delete in order considering foreign key constraints

        // 1. Authentication & Security
        await safeDelete('refresh_tokens', 'DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);
        await safeDelete('password_reset_tokens', 'DELETE FROM password_reset_tokens WHERE user_id = $1', [userId]);
        await safeDelete('social_auth', 'DELETE FROM social_auth WHERE user_id = $1', [userId]);
        await safeDelete('login_attempts', 'DELETE FROM login_attempts WHERE identifier = $1', [targetEmail]);

        // 2. User Roles & Verification
        await safeDelete('user_roles', 'DELETE FROM user_roles WHERE user_id = $1', [userId]);
        await safeDelete('verification_drafts', 'DELETE FROM verification_drafts WHERE user_id = $1', [userId]);
        await safeDelete('supplier_verifications', 'DELETE FROM supplier_verifications WHERE user_id = $1', [userId]);

        // 3. Feedback & Bug Reports
        await safeDelete('user_feedback', 'DELETE FROM user_feedback WHERE user_id = $1', [userId]);
        await safeDelete('bug_reports', 'DELETE FROM bug_reports WHERE user_id = $1', [userId]);

        // 4. Orders (delete items first, then orders)
        await safeDelete('order_items',
            'DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE user_id = $1)',
            [userId]
        );
        await safeDelete('orders', 'DELETE FROM orders WHERE user_id = $1', [userId]);

        // 5. Cart & Shopping
        await safeDelete('saved_items', 'DELETE FROM saved_items WHERE user_id = $1', [userId]);
        await safeDelete('cart_items',
            'DELETE FROM cart_items WHERE cart_id IN (SELECT id FROM carts WHERE user_id = $1)',
            [userId]
        );
        await safeDelete('carts', 'DELETE FROM carts WHERE user_id = $1', [userId]);

        // 6. Recently Viewed
        await safeDelete('recently_viewed', 'DELETE FROM recently_viewed WHERE user_id = $1', [userId]);

        // 7. Notifications
        await safeDelete('notifications', 'DELETE FROM notifications WHERE user_id = $1', [userId]);

        // 8. Payment Methods
        await safeDelete('payment_methods', 'DELETE FROM payment_methods WHERE user_id = $1', [userId]);

        // 9. RFQ & Quotes (delete messages and invitations first)
        await safeDelete('rfq_invitations',
            'DELETE FROM rfq_invitations WHERE rfq_id IN (SELECT id FROM rfqs WHERE buyer_id = $1)',
            [userId]
        );
        await safeDelete('rfq_messages',
            'DELETE FROM rfq_messages WHERE sender_id = $1 OR receiver_id = $1',
            [userId]
        );
        await safeDelete('quotes', 'DELETE FROM quotes WHERE supplier_id = $1 OR buyer_id = $1', [userId]);
        await safeDelete('rfqs', 'DELETE FROM rfqs WHERE buyer_id = $1', [userId]);

        // 10. Reviews & Product Interactions
        await safeDelete('reviews', 'DELETE FROM reviews WHERE user_id = $1', [userId]);
        await safeDelete('product_views', 'DELETE FROM product_views WHERE user_id = $1', [userId]);

        // 11. Search History
        await safeDelete('search_history', 'DELETE FROM search_history WHERE user_id = $1', [userId]);

        // 12. Payments & Invoices
        await safeDelete('invoices', 'DELETE FROM invoices WHERE supplier_id = $1 OR buyer_id = $1', [userId]);
        await safeDelete('transactions', 'DELETE FROM transactions WHERE supplier_id = $1 OR buyer_id = $1', [userId]);

        // 13. Clear reviewed_by references before deleting user
        await safeDelete('supplier_verifications_reviewed_by',
            'UPDATE supplier_verifications SET reviewed_by = NULL WHERE reviewed_by = $1',
            [userId]
        );

        // 14. Finally, delete the user record (this must succeed)
        const userDeleteResult = await client.query('DELETE FROM users WHERE id = $1', [userId]);
        deletionStats.users = userDeleteResult.rowCount || 0;

        console.log('\n✅ Account deletion completed successfully!\n');
        console.log('📊 Deletion Summary:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        Object.entries(deletionStats).forEach(([table, count]) => {
            if (count > 0) {
                console.log(`   ${table.padEnd(30)} : ${count} record(s)`);
            }
        });

        const totalRecords = Object.values(deletionStats).reduce((sum, count) => sum + count, 0);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`   ${'TOTAL RECORDS DELETED'.padEnd(30)} : ${totalRecords}\n`);

    } catch (error) {
        console.error('\n❌ Error during deletion:', error.message);
        console.error('\n⚠️  Deletion may be incomplete. Please check the database.\n');
        throw error;
    } finally {
        await client.end();
    }
}

// Execute the script
deleteUserAccount()
    .then(() => {
        console.log('✨ Script completed successfully.\n');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Script failed with error:', error);
        process.exit(1);
    });
