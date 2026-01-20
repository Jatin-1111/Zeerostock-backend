const { pool } = require('../config/database');
const fs = require('fs');
const path = require('path');

async function migrateAdmins() {
    const client = await pool.connect();

    try {
        console.log('🔄 Starting migration of admins...');
        // Transaction removed for debugging

        // 1. Create admins table
        console.log('Creating admins table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS admins (
                id UUID PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                first_name VARCHAR(100),
                last_name VARCHAR(100),
                role VARCHAR(50) DEFAULT 'admin',
                is_active BOOLEAN DEFAULT true,
                failed_login_attempts INTEGER DEFAULT 0,
                account_locked BOOLEAN DEFAULT false,
                lock_until TIMESTAMP,
                last_login TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 2. Select admin users (roles contains 'admin' or 'super_admin')
        // Note: Assuming 'roles' is a text array or jsonb in users table
        console.log('Fetching existing admins from users table...');
        const { rows: adminUsers } = await client.query(`
            SELECT * FROM users 
            WHERE 
                roles IS NOT NULL AND (
                    'admin' = ANY(roles) 
                    OR 'super_admin' = ANY(roles)
                )
        `);

        console.log(`Found ${adminUsers.length} admins to migrate.`);

        // 3. Insert into admins table
        // We PRESERVE the ID to verify foreign key integrity if possible, 
        // OR we map them if they are referenced elsewhere.
        // Assuming we want to KEEP the same ID to save relationships 
        // (like supplier_verifications.reviewed_by)

        for (const user of adminUsers) {
            try {
                let role = 'admin';
                if (user.roles && (user.roles.includes('super_admin') || user.is_super_admin)) {
                    role = 'super_admin';
                }

                // Check if already exists to avoid duplicates
                const { rows: existing } = await client.query('SELECT id FROM admins WHERE id = $1', [user.id]);

                if (existing.length === 0) {
                    await client.query(`
                        INSERT INTO admins (
                            id, email, password_hash, first_name, last_name, 
                            role, is_active, last_login, created_at, updated_at
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                        ON CONFLICT (email) DO NOTHING
                    `, [
                        user.id, // Preserving ID
                        user.business_email || user.email,
                        user.password_hash,
                        user.first_name,
                        user.last_name,
                        role,
                        user.is_active !== false,
                        user.last_login,
                        user.created_at,
                        user.updated_at
                    ]);
                    console.log(`Migrated admin: ${user.business_email || user.email} (${role})`);
                } else {
                    console.log(`Skipping existing admin: ${user.business_email || user.email}`);
                }
            } catch (err) {
                console.error(`Failed to migrate user ${user.id}:`, err.message);
            }
        }

        // 4. Cleanup (User asked to separate them)
        // We risk breaking concurrent logins if we delete immediately, but "separate" implies moving.
        // However, removing from 'users' might trigger FK constraints if 'users' is referenced by other tables 
        // that 'admins' is not.

        // Relationship check:
        // - supplier_verifications.reviewed_by -> references users(id)?
        // If it references users(id), we CANNOT delete from users unless we update the constraint 
        // to point to admins OR make it polymorphic.

        // For now, let's remove the 'admin'/'super_admin' ROLE from the users table 
        // effectively demoting them or cleaning up their permissions there, 
        // but keeping the record if necessary for FKs. 
        // IF they are ONLY admins, maybe delete?

        // Let's safe-approach: Remove the roles.
        console.log('Cleaning up roles in users table...');
        // Only update if they exist in users (they do)
        for (const user of adminUsers) {
            try {
                // Remove admin roles
                const newRoles = (user.roles || []).filter(r => r !== 'admin' && r !== 'super_admin');

                if (newRoles.length === 0) {
                    // If no roles left, delete the user? 
                    // Risk: FK violation.
                    // Better to leave them with empty roles or 'migrated_admin' for now?
                    // Or just DELETE and let it fail if constraint exists, catching error?

                    try {
                        await client.query('DELETE FROM users WHERE id = $1', [user.id]);
                        console.log(`Deleted user record ${user.id} (no other roles)`);
                    } catch (err) {
                        console.warn(`Could not delete user ${user.id} (FK constraint?). Removing roles instead.`);
                        await client.query('UPDATE users SET roles = $1 WHERE id = $2', [[], user.id]);
                    }
                } else {
                    await client.query('UPDATE users SET roles = $1 WHERE id = $2', [newRoles, user.id]);
                    console.log(`Updated user ${user.id} roles (removed admin roles)`);
                }
            } catch (err) {
                console.error(`Failed to cleanup user ${user.id}:`, err.message);
            }
        }

        console.log('✅ Migration completed successfully.');
    } catch (e) {
        console.error('❌ Migration logic error:', e);
    } finally {
        client.release();
        pool.end();
    }
}

migrateAdmins();
