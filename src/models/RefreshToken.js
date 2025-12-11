const { supabase } = require('../config/database');

const RefreshToken = {
    /**
     * Create refresh token
     */
    async create(userId, token, expiresAt) {
        const { data, error } = await supabase
            .from('refresh_tokens')
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
     * Find refresh token
     */
    async findByToken(token) {
        const { data, error } = await supabase
            .from('refresh_tokens')
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
            .from('refresh_tokens')
            .update({ revoked: true })
            .eq('token', token)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Revoke all user tokens
     */
    async revokeAllUserTokens(userId) {
        const { data, error } = await supabase
            .from('refresh_tokens')
            .update({ revoked: true })
            .eq('user_id', userId)
            .eq('revoked', false);

        if (error) throw error;
        return data;
    },

    /**
     * Delete expired tokens
     */
    async deleteExpired() {
        const { data, error } = await supabase
            .from('refresh_tokens')
            .delete()
            .lt('expires_at', new Date().toISOString());

        if (error) throw error;
        return data;
    }
};

module.exports = RefreshToken;
