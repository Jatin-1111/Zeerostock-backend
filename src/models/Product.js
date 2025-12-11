const { supabase } = require('../config/database');

/**
 * Product Model
 * Handles product listings and inventory operations
 */
class Product {
    /**
     * Get featured deals
     * @param {number} limit
     * @returns {Promise<Array>}
     */
    static async getFeaturedDeals(limit = 12) {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('status', 'active')
            .eq('is_featured', true)
            .order('discount_percent', { ascending: false })
            .order('listed_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Error in getFeaturedDeals:', error);
            return [];
        }
        return data || [];
    }

    /**
     * Get trending products
     * @param {number} limit
     * @returns {Promise<Array>}
     */
    static async getTrending(limit = 12) {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('status', 'active')
            .eq('is_trending', true)
            .order('views_count', { ascending: false })
            .order('watchers_count', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Error in getTrending:', error);
            return [];
        }
        return data || [];
    }

    /**
     * Get product by ID
     * @param {string} productId
     * @returns {Promise<Object>}
     */
    static async findById(productId) {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('id', productId)
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Track product view
     * @param {string} productId
     * @param {string|null} userId
     * @param {string} sessionId
     * @param {string} ipAddress
     * @param {string} userAgent
     * @returns {Promise<void>}
     */
    static async trackView(productId, userId, sessionId, ipAddress, userAgent) {
        try {
            const { error } = await supabase
                .from('product_views')
                .insert({
                    product_id: productId,
                    user_id: userId,
                    session_id: sessionId,
                    ip_address: ipAddress,
                    user_agent: userAgent
                });

            if (error) console.error('Error tracking view:', error);
        } catch (error) {
            console.error('Error tracking view:', error);
        }
    }

    /**
     * Get products by category
     * @param {string} categoryId
     * @param {number} limit
     * @returns {Promise<Array>}
     */
    static async getByCategory(categoryId, limit = 20) {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('category_id', categoryId)
            .eq('status', 'active')
            .order('listed_at', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data || [];
    }

    /**
     * Get recently listed products
     * @param {number} limit
     * @returns {Promise<Array>}
     */
    static async getRecent(limit = 12) {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('status', 'active')
            .order('listed_at', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data || [];
    }
}

module.exports = Product;