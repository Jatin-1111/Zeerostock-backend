const { supabase, query } = require('../config/database');

const Admin = {
    /**
     * Find admin by email
     */
    async findByEmail(email) {
        const { data, error } = await supabase
            .from('admins')
            .select('*')
            .eq('email', email)
            .single();

        if (error && error.code !== 'PGRST116') return null;
        return data;
    },

    /**
     * Find admin by ID
     */
    async findById(id) {
        const { data, error } = await supabase
            .from('admins')
            .select('*')
            .eq('id', id)
            .single();

        if (error) return null;
        return data;
    },

    /**
     * Create new admin
     */
    async create(adminData) {
        const { data, error } = await supabase
            .from('admins')
            .insert([adminData])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Update admin
     */
    async update(id, updateData) {
        const { data, error } = await supabase
            .from('admins')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async findByAdminId(adminId) {
        const { data, error } = await supabase
            .from('admins')
            .select('*')
            .eq('admin_id', adminId)
            .single();

        if (error && error.code !== 'PGRST116') return null;
        return data;
    },

    async incrementFailedLoginAttempts(id) {
        const admin = await this.findById(id);
        const attempts = (admin.failed_login_attempts || 0) + 1;
        const updateData = { failed_login_attempts: attempts };

        if (attempts >= 5) {
            updateData.account_locked = true;
            updateData.lock_until = new Date(Date.now() + 30 * 60 * 1000).toISOString();
        }

        const { data, error } = await supabase
            .from('admins')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async resetFailedLoginAttempts(id) {
        const { data, error } = await supabase
            .from('admins')
            .update({
                failed_login_attempts: 0,
                account_locked: false,
                lock_until: null
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async checkAndUnlockAccount(id) {
        const admin = await this.findById(id);
        if (admin && admin.account_locked && admin.lock_until) {
            if (new Date(admin.lock_until) < new Date()) {
                await this.resetFailedLoginAttempts(id);
                return true;
            }
        }
        return false;
    },

    async updateAdminCredentials(id, updates) {
        const { data, error } = await supabase
            .from('admins')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async updateLastLogin(id) {
        const { data, error } = await supabase
            .from('admins')
            .update({ last_login: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Get all admin users
     */
    async getAllAdmins() {
        const { data, error } = await supabase
            .from('admins')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    /**
     * Delete admin by ID
     */
    async delete(id) {
        const { error } = await supabase
            .from('admins')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    }
};

module.exports = Admin;
