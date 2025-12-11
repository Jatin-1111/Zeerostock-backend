const { supabase } = require('../config/database');

const PasswordResetToken = {
    /**
     * Create password reset token
     */
    async create(userId, token, expiresAt) {
        const { data, error } = await supabase
            .from('password_reset_tokens')
            .insert([{
                user_id: userId,
                token,
                expires_at: expiresAt
            }])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Find valid reset token
     */
    async findValidToken(token) {
        const { data, error } = await supabase
            .from('password_reset_tokens')
            .select('*')
            .eq('token', token)
            .eq('used', false)
            .single();

        if (error) return null;

        // Check if token is expired
        if (new Date(data.expires_at) < new Date()) {
            return null;
        }

        return data;
    },

    /**
     * Mark token as used
     */
    async markAsUsed(token) {
        const { data, error } = await supabase
            .from('password_reset_tokens')
            .update({ used: true })
            .eq('token', token)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Delete expired tokens
     */
    async deleteExpired() {
        const { data, error } = await supabase
            .from('password_reset_tokens')
            .delete()
            .lt('expires_at', new Date().toISOString());

        if (error) throw error;
        return data;
    },

    /**
     * Invalidate all user reset tokens
     */
    async invalidateUserTokens(userId) {
        const { data, error } = await supabase
            .from('password_reset_tokens')
            .update({ used: true })
            .eq('user_id', userId)
            .eq('used', false);

        if (error) throw error;
        return data;
    }
};

module.exports = PasswordResetToken;
