const { supabase } = require('../config/database');

/**
 * OrderItem Model
 * Handles order items operations
 */
class OrderItem {
    /**
     * Create order items in bulk
     * @param {Array} items
     * @returns {Promise<Array>}
     */
    static async createBulk(items) {
        const { data, error } = await supabase
            .from('order_items')
            .insert(items)
            .select();

        if (error) throw error;
        return data;
    }

    /**
     * Get order items by order ID
     * @param {string} orderId
     * @returns {Promise<Array>}
     */
    static async getByOrderId(orderId) {
        const { data, error } = await supabase
            .from('order_items')
            .select('*')
            .eq('order_id', orderId);

        if (error) throw error;
        return data || [];
    }

    /**
     * Update order item status
     * @param {string} itemId
     * @param {string} status
     * @returns {Promise<Object>}
     */
    static async updateStatus(itemId, status) {
        const { data, error } = await supabase
            .from('order_items')
            .update({ item_status: status })
            .eq('id', itemId)
            .select()
            .single();

        if (error) throw error;
        return data;
    }
}

module.exports = OrderItem;
