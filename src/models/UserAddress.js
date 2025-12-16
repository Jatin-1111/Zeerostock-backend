const { supabase } = require('../config/database');

/**
 * UserAddress Model
 * Handles user shipping and billing addresses
 */
class UserAddress {
    /**
     * Create a new address
     * @param {Object} addressData
     * @returns {Promise<Object>}
     */
    static async create(addressData) {
        // If this is marked as default, unset other defaults
        if (addressData.is_default) {
            await this.unsetDefaultAddresses(addressData.user_id, addressData.address_type);
        }

        const { data, error } = await supabase
            .from('user_addresses')
            .insert([addressData])
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Get address by ID
     * @param {string} addressId
     * @param {string} userId
     * @returns {Promise<Object>}
     */
    static async findById(addressId, userId) {
        const { data, error } = await supabase
            .from('user_addresses')
            .select('*')
            .eq('id', addressId)
            .eq('user_id', userId)
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Get user addresses
     * @param {string} userId
     * @param {string} addressType - 'shipping', 'billing', 'both'
     * @returns {Promise<Array>}
     */
    static async getByUserId(userId, addressType = null) {
        let query = supabase
            .from('user_addresses')
            .select('*')
            .eq('user_id', userId);

        if (addressType) {
            query = query.or(`address_type.eq.${addressType},address_type.eq.both`);
        }

        const { data, error } = await query
            .order('is_default', { ascending: false })
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    }

    /**
     * Get default address
     * @param {string} userId
     * @param {string} addressType
     * @returns {Promise<Object>}
     */
    static async getDefaultAddress(userId, addressType = 'shipping') {
        const { data, error } = await supabase
            .from('user_addresses')
            .select('*')
            .eq('user_id', userId)
            .or(`address_type.eq.${addressType},address_type.eq.both`)
            .eq('is_default', true)
            .single();

        if (error && error.code !== 'PGRST116') {
            throw error;
        }

        return data;
    }

    /**
     * Update address
     * @param {string} addressId
     * @param {string} userId
     * @param {Object} updateData
     * @returns {Promise<Object>}
     */
    static async update(addressId, userId, updateData) {
        // If setting as default, unset other defaults
        if (updateData.is_default) {
            await this.unsetDefaultAddresses(userId, updateData.address_type || 'shipping');
        }

        const { data, error } = await supabase
            .from('user_addresses')
            .update(updateData)
            .eq('id', addressId)
            .eq('user_id', userId)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Delete address
     * @param {string} addressId
     * @param {string} userId
     * @returns {Promise<boolean>}
     */
    static async delete(addressId, userId) {
        const { error } = await supabase
            .from('user_addresses')
            .delete()
            .eq('id', addressId)
            .eq('user_id', userId);

        if (error) throw error;
        return true;
    }

    /**
     * Set address as default
     * @param {string} addressId
     * @param {string} userId
     * @returns {Promise<Object>}
     */
    static async setAsDefault(addressId, userId) {
        // First get the address to know its type
        const address = await this.findById(addressId, userId);

        // Unset other defaults of the same type
        await this.unsetDefaultAddresses(userId, address.address_type);

        // Set this as default
        const { data, error } = await supabase
            .from('user_addresses')
            .update({ is_default: true })
            .eq('id', addressId)
            .eq('user_id', userId)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Unset default addresses (internal helper)
     * @param {string} userId
     * @param {string} addressType
     * @private
     */
    static async unsetDefaultAddresses(userId, addressType) {
        await supabase
            .from('user_addresses')
            .update({ is_default: false })
            .eq('user_id', userId)
            .or(`address_type.eq.${addressType},address_type.eq.both`);
    }
}

module.exports = UserAddress;
