const { supabase } = require('../config/database');

const AdminRefreshToken = {
    /**
     * Create refresh token
     */
    async create(adminId, token, expiresAt) {
        const { data, error } = await supabase
            .from('admin_refresh_tokens')
            .insert([{
                admin_id: adminId,
                token,
                expires_at: expiresAt
            }])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Find refresh token
     */
    async findByToken(token) {
        const { data, error } = await supabase
            .from('admin_refresh_tokens')
            .select('*')
            .eq('token', token)
            .eq('revoked', false)
            .single();

        if (error) return null;

        // Check if token is expired
        if (new Date(data.expires_at) < new Date()) {
            return null;
        }

        return data;
    },

    /**
     * Revoke refresh token
     */
    async revoke(token) {
        const { data, error } = await supabase
            .from('admin_refresh_tokens')
            .update({ revoked: true })
            .eq('token', token)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Revoke all admin tokens
     */
    async revokeAllAdminTokens(adminId) {
        const { data, error } = await supabase
            .from('admin_refresh_tokens')
            .update({ revoked: true })
            .eq('admin_id', adminId)
            .eq('revoked', false);

        if (error) throw error;
        return data;
    },

    /**
     * Delete expired tokens
     */
    async deleteExpired() {
        const { data, error } = await supabase
            .from('admin_refresh_tokens')
            .delete()
            .lt('expires_at', new Date().toISOString());

        if (error) throw error;
        return data;
    }
};

module.exports = AdminRefreshToken;
