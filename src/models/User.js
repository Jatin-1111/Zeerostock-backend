const { supabase } = require('../config/database');

const User = {
    /**
     * Create a new user
     */
    async create(userData) {
        const { data, error } = await supabase
            .from('users')
            .insert([userData])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Find user by email
     */
    async findByEmail(email) {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('business_email', email)
            .single();

        if (error && error.code !== 'PGRST116') return null;
        return data;
    },

    /**
     * Find user by mobile
     */
    async findByMobile(mobile) {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('mobile', mobile)
            .single();

        if (error && error.code !== 'PGRST116') return null;
        return data;
    },

    /**
     * Find user by email or mobile
     */
    async findByEmailOrMobile(identifier) {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .or(`business_email.eq.${identifier},mobile.eq.${identifier}`)
            .single();

        if (error && error.code !== 'PGRST116') return null;
        return data;
    },

    /**
     * Find user by ID
     */
    async findById(id) {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', id)
            .single();

        if (error) return null;
        return data;
    },

    /**
     * Update user
     */
    async update(id, updateData) {
        const { data, error } = await supabase
            .from('users')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Update OTP
     */
    async updateOTP(id, otp, expiresAt) {
        const { data, error } = await supabase
            .from('users')
            .update({
                otp,
                otp_expires_at: expiresAt
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Verify OTP
     */
    async verifyOTP(identifier, otp) {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .or(`business_email.eq.${identifier},mobile.eq.${identifier}`)
            .eq('otp', otp)
            .single();

        if (error || !data) return null;

        // Check if OTP is expired
        if (new Date(data.otp_expires_at) < new Date()) {
            return null;
        }

        return data;
    },

    /**
     * Mark user as verified
     */
    async markAsVerified(id) {
        const { data, error } = await supabase
            .from('users')
            .update({
                is_verified: true,
                otp: null,
                otp_expires_at: null
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Update last login
     */
    async updateLastLogin(id) {
        const { data, error } = await supabase
            .from('users')
            .update({ last_login: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Update password
     */
    async updatePassword(id, passwordHash) {
        const { data, error } = await supabase
            .from('users')
            .update({ password_hash: passwordHash })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Update role
     */
    async updateRole(id, role) {
        const { data, error } = await supabase
            .from('users')
            .update({ role })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Add GST number
     */
    async addGST(id, gstNumber) {
        const { data, error } = await supabase
            .from('users')
            .update({ gst_number: gstNumber })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Check if user exists by provider ID (for social auth)
     */
    async findByProviderId(provider, providerId) {
        const { data, error } = await supabase
            .from('social_auth')
            .select('user_id')
            .eq('provider', provider)
            .eq('provider_user_id', providerId)
            .single();

        if (error || !data) return null;

        return await this.findById(data.user_id);
    },

    /**
     * Create social auth record
     */
    async createSocialAuth(userId, provider, providerId) {
        const { data, error } = await supabase
            .from('social_auth')
            .insert([{
                user_id: userId,
                provider,
                provider_user_id: providerId
            }])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // ============================================
    // MULTI-ROLE METHODS
    // ============================================

    /**
     * Check if user can access supplier role
     */
    async canAccessSupplierRole(userId) {
        const { data, error } = await supabase
            .from('users')
            .select(`
                roles,
                supplier_profiles:supplier_profiles(verification_status)
            `)
            .eq('id', userId)
            .single();

        if (error || !data) {
            return {
                hasRole: false,
                isVerified: false,
                status: null
            };
        }

        const hasSupplierRole = data.roles && data.roles.includes('supplier');
        const supplierProfile = data.supplier_profiles?.[0];
        const status = supplierProfile?.verification_status || null;
        const isVerified = status === 'verified';

        return {
            hasRole: hasSupplierRole,
            isVerified: isVerified,
            status: status
        };
    },

    /**
     * Add role to user
     */
    async addRole(userId, role) {
        // Get current user to check existing roles
        const user = await this.findById(userId);
        if (!user) throw new Error('User not found');

        // Admin role is exclusive - cannot be combined with buyer/supplier
        if (role === 'admin' && user.roles && user.roles.length > 0) {
            throw new Error('Admin role must be exclusive. Remove other roles first.');
        }

        // Cannot add buyer/supplier to admin
        if (user.roles && user.roles.includes('admin') && (role === 'buyer' || role === 'supplier')) {
            throw new Error('Admin users cannot have buyer or supplier roles.');
        }

        // For supplier role, check verification first
        if (role === 'supplier') {
            const access = await this.canAccessSupplierRole(userId);
            if (!access.isVerified) {
                throw new Error('Supplier role requires admin verification');
            }
        }

        // Check if role already exists
        if (user.roles && user.roles.includes(role)) {
            return user;
        }

        // Add role to array
        const newRoles = [...(user.roles || []), role];

        const { data, error } = await supabase
            .from('users')
            .update({
                roles: newRoles,
                updated_at: new Date().toISOString()
            })
            .eq('id', userId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Remove role from user
     */
    async removeRole(userId, role) {
        const user = await this.findById(userId);
        if (!user) throw new Error('User not found');

        // Must have at least one role
        if (!user.roles || user.roles.length <= 1) {
            throw new Error('User must have at least one role');
        }

        // Remove role from array
        const newRoles = user.roles.filter(r => r !== role);

        const { data, error } = await supabase
            .from('users')
            .update({
                roles: newRoles,
                updated_at: new Date().toISOString()
            })
            .eq('id', userId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Switch active role
     */
    async switchActiveRole(userId, newRole) {
        const user = await this.findById(userId);
        if (!user) throw new Error('User not found');

        // Admin cannot switch roles
        if (user.roles && user.roles.includes('admin')) {
            throw new Error('Admin users cannot switch to other roles');
        }

        // If switching to supplier, verify they have verified access
        if (newRole === 'supplier') {
            const access = await this.canAccessSupplierRole(userId);
            if (!access.isVerified) {
                throw new Error('Your supplier account is not yet verified. Please wait for admin approval.');
            }
        }

        // Check if role exists
        if (!user.roles || !user.roles.includes(newRole)) {
            throw new Error('User does not have this role');
        }

        const { data, error } = await supabase
            .from('users')
            .update({
                active_role: newRole,
                updated_at: new Date().toISOString()
            })
            .eq('id', userId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Check if user has specific role
     */
    async hasRole(userId, role) {
        const user = await this.findById(userId);
        return user && user.roles && user.roles.includes(role);
    },

    /**
     * Get user with role-specific profiles
     */
    async getUserWithProfiles(userId) {
        const { data, error } = await supabase
            .from('users')
            .select(`
                *,
                buyer_profiles(*),
                supplier_profiles(*)
            `)
            .eq('id', userId)
            .single();

        if (error) throw error;

        // Format the response
        return {
            ...data,
            buyer_profile: data.buyer_profiles?.[0] || null,
            supplier_profile: data.supplier_profiles?.[0] || null,
            buyer_profiles: undefined,
            supplier_profiles: undefined
        };
    },

    /**
     * Create or update buyer profile
     */
    async createBuyerProfile(userId, profileData) {
        const { data, error } = await supabase
            .from('buyer_profiles')
            .upsert({
                user_id: userId,
                company_name: profileData.company_name,
                industry: profileData.industry,
                preferred_categories: profileData.preferred_categories,
                budget_range: profileData.budget_range,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'user_id'
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Create or update supplier profile
     */
    async createSupplierProfile(userId, profileData) {
        const { data, error } = await supabase
            .from('supplier_profiles')
            .upsert({
                user_id: userId,
                business_name: profileData.business_name,
                business_type: profileData.business_type,
                gst_number: profileData.gst_number,
                pan_number: profileData.pan_number,
                warehouse_locations: profileData.warehouse_locations,
                product_categories: profileData.product_categories,
                business_address: profileData.business_address,
                business_email: profileData.business_email,
                business_phone: profileData.business_phone,
                gst_certificate_url: profileData.gst_certificate_url,
                pan_card_url: profileData.pan_card_url,
                business_license_url: profileData.business_license_url,
                address_proof_url: profileData.address_proof_url,
                verification_status: 'pending',
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'user_id'
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Get buyer profile by user ID
     */
    async getBuyerProfile(userId) {
        const { data, error } = await supabase
            .from('buyer_profiles')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error && error.code !== 'PGRST116') return null;
        return data;
    },

    /**
     * Get supplier profile by user ID
     */
    async getSupplierProfile(userId) {
        const { data, error } = await supabase
            .from('supplier_profiles')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error && error.code !== 'PGRST116') return null;
        return data;
    },

    // ============================================
    // ADMIN-SPECIFIC METHODS
    // ============================================

    /**
     * Find admin by adminId
     */
    async findByAdminId(adminId) {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('admin_id', adminId)
            .single();

        if (error && error.code !== 'PGRST116') return null;
        return data;
    },

    /**
     * Check if adminId exists
     */
    async adminIdExists(adminId) {
        const { data, error } = await supabase
            .from('users')
            .select('id')
            .eq('admin_id', adminId)
            .single();

        return !!data;
    },

    /**
     * Get all admin users
     */
    async getAllAdmins() {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .contains('roles', ['admin'])
            .or('roles.cs.{super_admin}')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    /**
     * Increment failed login attempts
     */
    async incrementFailedLoginAttempts(userId) {
        const user = await this.findById(userId);
        const attempts = (user.failed_login_attempts || 0) + 1;

        const updateData = { failed_login_attempts: attempts };

        // Lock account after 5 failed attempts
        if (attempts >= 5) {
            updateData.account_locked = true;
            updateData.lock_until = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 minutes
        }

        const { data, error } = await supabase
            .from('users')
            .update(updateData)
            .eq('id', userId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Reset failed login attempts
     */
    async resetFailedLoginAttempts(userId) {
        const { data, error } = await supabase
            .from('users')
            .update({
                failed_login_attempts: 0,
                account_locked: false,
                lock_until: null
            })
            .eq('id', userId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Update admin credentials (for password changes)
     */
    async updateAdminCredentials(userId, updates) {
        const { data, error } = await supabase
            .from('users')
            .update(updates)
            .eq('id', userId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Check if account lock has expired
     */
    async checkAndUnlockAccount(userId) {
        const user = await this.findById(userId);

        if (user && user.account_locked && user.lock_until) {
            const lockUntil = new Date(user.lock_until);
            if (lockUntil < new Date()) {
                // Lock expired, unlock account
                await this.resetFailedLoginAttempts(userId);
                return true;
            }
        }
        return false;
    }
};

module.exports = User;
