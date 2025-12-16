const { supabase } = require('../config/database');

/**
 * Watchlist Model
 * Handles saved/watchlisted products operations
 */
class Watchlist {
    /**
     * Add product to watchlist
     * @param {string} userId
     * @param {string} productId
     * @param {number} priceAtAdd
     * @returns {Promise<Object>}
     */
    static async add(userId, productId, priceAtAdd = null) {
        const { data, error } = await supabase
            .from('watchlist')
            .insert({
                user_id: userId,
                product_id: productId,
                price_at_add: priceAtAdd
            })
            .select();

        if (error) {
            if (error.code === '23505') { // Unique constraint violation
                throw new Error('PRODUCT_ALREADY_IN_WATCHLIST');
            }
            throw error;
        }

        return data && data.length > 0 ? data[0] : null;
    }

    /**
     * Remove product from watchlist
     * @param {string} userId
     * @param {string} productId
     * @returns {Promise<boolean>}
     */
    static async remove(userId, productId) {
        const { error } = await supabase
            .from('watchlist')
            .delete()
            .eq('user_id', userId)
            .eq('product_id', productId);

        if (error) throw error;
        return true;
    }

    /**
     * Get user's watchlist
     * @param {string} userId
     * @param {Object} options - {page, limit}
     * @returns {Promise<Object>}
     */
    static async getByUserId(userId, options = {}) {
        const { page = 1, limit = 20 } = options;
        const offset = (page - 1) * limit;

        const { data, error, count } = await supabase
            .from('watchlist')
            .select(`
                id,
                price_at_add,
                created_at,
                products (
                    id,
                    title,
                    slug,
                    image_url,
                    gallery_images,
                    price_before,
                    price_after,
                    discount_percent,
                    city,
                    state,
                    condition,
                    listing_type,
                    status,
                    quantity,
                    expires_at
                )
            `, { count: 'exact' })
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) throw error;

        return {
            items: data || [],
            pagination: {
                page,
                limit,
                total: count,
                totalPages: Math.ceil(count / limit)
            }
        };
    }

    /**
     * Check if product is in watchlist
     * @param {string} userId
     * @param {string} productId
     * @returns {Promise<boolean>}
     */
    static async isInWatchlist(userId, productId) {
        const { data, error } = await supabase
            .from('watchlist')
            .select('id')
            .eq('user_id', userId)
            .eq('product_id', productId)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('Error checking watchlist:', error);
            return false;
        }

        return !!data;
    }

    /**
     * Get watchlist count for user
     * @param {string} userId
     * @returns {Promise<number>}
     */
    static async getCount(userId) {
        const { count, error } = await supabase
            .from('watchlist')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId);

        if (error) {
            console.error('Error getting watchlist count:', error);
            return 0;
        }

        return count || 0;
    }

    /**
     * Clear unavailable products from watchlist
     * @param {string} userId
     * @returns {Promise<number>}
     */
    static async clearUnavailable(userId) {
        // Get all products in watchlist that are not active
        const { data: watchlistItems } = await supabase
            .from('watchlist')
            .select(`
                id,
                product_id,
                products!inner(status)
            `)
            .eq('user_id', userId)
            .neq('products.status', 'active');

        if (!watchlistItems || watchlistItems.length === 0) {
            return 0;
        }

        const idsToRemove = watchlistItems.map(item => item.id);

        const { error } = await supabase
            .from('watchlist')
            .delete()
            .in('id', idsToRemove);

        if (error) throw error;

        return idsToRemove.length;
    }
}

module.exports = Watchlist;
