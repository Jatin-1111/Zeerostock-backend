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
    }
};

module.exports = User;
