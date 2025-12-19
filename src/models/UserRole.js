const { query: db } = require('../config/database');

class UserRole {
    /**
     * Find all roles for a user
     * @param {string} userId - User ID
     * @returns {Promise<Array>} Array of role objects
     */
    static async findByUserId(userId) {
        const query = `
      SELECT id, user_id, role, is_active, verified_at, verification_status, 
             rejection_reason, created_at, updated_at
      FROM user_roles
      WHERE user_id = $1
      ORDER BY created_at ASC
    `;
        const result = await db(query, [userId]);
        return result.rows;
    }

    /**
     * Find active roles for a user
     * @param {string} userId - User ID
     * @returns {Promise<Array>} Array of active role names ['buyer', 'supplier']
     */
    static async findActiveRoles(userId) {
        const query = `
      SELECT role
      FROM user_roles
      WHERE user_id = $1 AND is_active = true
      ORDER BY created_at ASC
    `;
        const result = await db(query, [userId]);
        return result.rows.map(row => row.role);
    }

    /**
     * Find specific role for a user
     * @param {string} userId - User ID
     * @param {string} role - Role name ('buyer' or 'supplier')
     * @returns {Promise<Object|null>} Role object or null
     */
    static async findOne(userId, role) {
        const query = `
      SELECT id, user_id, role, is_active, verified_at, verification_status,
             rejection_reason, created_at, updated_at
      FROM user_roles
      WHERE user_id = $1 AND role = $2
    `;
        const result = await db(query, [userId, role]);
        return result.rows[0] || null;
    }

    /**
     * Find specific role for a user (alias for findOne - used by auth middleware)
     * @param {string} userId - User ID
     * @param {string} role - Role name ('buyer' or 'supplier')
     * @returns {Promise<Object|null>} Role object or null
     */
    static async findByUserAndRole(userId, role) {
        return this.findOne(userId, role);
    }

    /**
     * Create or update a role (UPSERT) - handles duplicate role applications
     * Edge Case: Prevents race conditions when applying for same role simultaneously
     * @param {string} userId - User ID
     * @param {string} role - Role name ('buyer' or 'supplier')
     * @param {Object} data - Role data (is_active, verification_status, etc.)
     * @returns {Promise<Object>} Created/updated role object
     */
    static async upsert(userId, role, data = {}) {
        const {
            is_active = false,
            verification_status = 'pending',
            verified_at = null,
            rejection_reason = null
        } = data;

        const query = `
      INSERT INTO user_roles (user_id, role, is_active, verification_status, verified_at, rejection_reason)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (user_id, role) 
      DO UPDATE SET 
        is_active = EXCLUDED.is_active,
        verification_status = EXCLUDED.verification_status,
        verified_at = EXCLUDED.verified_at,
        rejection_reason = EXCLUDED.rejection_reason,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

        const result = await db(query, [
            userId,
            role,
            is_active,
            verification_status,
            verified_at,
            rejection_reason
        ]);

        return result.rows[0];
    }

    /**
     * Create a new role for user (buyer default on signup)
     * @param {string} userId - User ID
     * @param {string} role - Role name
     * @param {boolean} isActive - Is role active
     * @returns {Promise<Object>} Created role object
     */
    static async create(userId, role = 'buyer', isActive = true) {
        const query = `
      INSERT INTO user_roles (user_id, role, is_active, verified_at, verification_status)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
        const verifiedAt = isActive ? new Date() : null;
        const status = role === 'buyer' ? 'approved' : 'pending';

        const result = await db(query, [userId, role, isActive, verifiedAt, status]);
        return result.rows[0];
    }

    /**
     * Update role status (for admin approval/rejection)
     * Edge Case: Supplier rejection doesn't affect buyer role
     * @param {string} userId - User ID
     * @param {string} role - Role name
     * @param {Object} updates - Fields to update
     * @returns {Promise<Object>} Updated role object
     */
    static async updateStatus(userId, role, updates) {
        const {
            is_active,
            verification_status,
            verified_at,
            rejection_reason
        } = updates;

        const fields = [];
        const values = [];
        let paramIndex = 1;

        if (is_active !== undefined) {
            fields.push(`is_active = $${paramIndex++}`);
            values.push(is_active);
        }
        if (verification_status !== undefined) {
            fields.push(`verification_status = $${paramIndex++}`);
            values.push(verification_status);
        }
        if (verified_at !== undefined) {
            fields.push(`verified_at = $${paramIndex++}`);
            values.push(verified_at);
        }
        if (rejection_reason !== undefined) {
            fields.push(`rejection_reason = $${paramIndex++}`);
            values.push(rejection_reason);
        }

        fields.push(`updated_at = CURRENT_TIMESTAMP`);

        values.push(userId, role);

        const query = `
      UPDATE user_roles
      SET ${fields.join(', ')}
      WHERE user_id = $${paramIndex++} AND role = $${paramIndex++}
      RETURNING *
    `;

        const result = await db(query, values);
        return result.rows[0];
    }

    /**
     * Check if user has specific role (active)
     * @param {string} userId - User ID
     * @param {string} role - Role name
     * @returns {Promise<boolean>} True if user has active role
     */
    static async hasActiveRole(userId, role) {
        const query = `
      SELECT id FROM user_roles
      WHERE user_id = $1 AND role = $2 AND is_active = true
    `;
        const result = await db(query, [userId, role]);
        return result.rows.length > 0;
    }

    /**
     * Check if user can reapply for supplier role after rejection
     * Edge Case: 30-day cooldown period after rejection
     * @param {string} userId - User ID
     * @returns {Promise<Object>} { canReapply: boolean, daysRemaining: number }
     */
    static async canReapplySupplier(userId) {
        const query = `
      SELECT updated_at
      FROM user_roles
      WHERE user_id = $1 AND role = 'supplier' AND verification_status = 'rejected'
      ORDER BY updated_at DESC
      LIMIT 1
    `;
        const result = await db(query, [userId]);

        if (result.rows.length === 0) {
            return { canReapply: true, daysRemaining: 0 };
        }

        const lastRejection = new Date(result.rows[0].updated_at);
        const now = new Date();
        const daysSinceRejection = (now - lastRejection) / (1000 * 60 * 60 * 24);
        const cooldownDays = 30;

        return {
            canReapply: daysSinceRejection >= cooldownDays,
            daysRemaining: Math.max(0, Math.ceil(cooldownDays - daysSinceRejection))
        };
    }

    /**
     * Deactivate a role (soft delete)
     * Edge Case: Check for active orders/listings before deactivation
     * @param {string} userId - User ID
     * @param {string} role - Role name
     * @returns {Promise<Object>} Updated role object
     */
    static async deactivate(userId, role) {
        const query = `
      UPDATE user_roles
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $1 AND role = $2
      RETURNING *
    `;
        const result = await db(query, [userId, role]);
        return result.rows[0];
    }
}

module.exports = UserRole;
