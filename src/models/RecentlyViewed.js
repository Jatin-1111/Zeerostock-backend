const { supabase } = require('../config/database');

/**
 * RecentlyViewed Model
 * Handles recently viewed products tracking
 */
class RecentlyViewed {
    /**
     * Add or update recently viewed product
     * @param {string} userId
     * @param {string} productId
     * @returns {Promise<Object>}
     */
    static async addOrUpdate(userId, productId) {
        // Check if already exists
        const { data: existing } = await supabase
            .from('recently_viewed')
            .select('id, view_count')
            .eq('user_id', userId)
            .eq('product_id', productId)
            .maybeSingle();

        if (existing) {
            // Update existing record
            const { data, error } = await supabase
                .from('recently_viewed')
                .update({
                    view_count: existing.view_count + 1,
                    last_viewed_at: new Date().toISOString()
                })
                .eq('id', existing.id)
                .select();

            if (error) throw error;
            return data && data.length > 0 ? data[0] : null;
        } else {
            // Insert new record
            const { data, error } = await supabase
                .from('recently_viewed')
                .insert({
                    user_id: userId,
                    product_id: productId,
                    view_count: 1,
                    last_viewed_at: new Date().toISOString()
                })
                .select();

            if (error) throw error;
            return data && data.length > 0 ? data[0] : null;
        }
    }

    /**
     * Get user's recently viewed products
     * @param {string} userId
     * @param {Object} options - {page, limit}
     * @returns {Promise<Object>}
     */
    static async getByUserId(userId, options = {}) {
        const { page = 1, limit = 50 } = options;
        const offset = (page - 1) * limit;

        const { data, error, count } = await supabase
            .from('recently_viewed')
            .select(`
                id,
                view_count,
                last_viewed_at,
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
            .order('last_viewed_at', { ascending: false })
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
     * Clear recently viewed for user
     * @param {string} userId
     * @returns {Promise<boolean>}
     */
    static async clearAll(userId) {
        const { error } = await supabase
            .from('recently_viewed')
            .delete()
            .eq('user_id', userId);

        if (error) throw error;
        return true;
    }

    /**
     * Remove specific product from recently viewed
     * @param {string} userId
     * @param {string} productId
     * @returns {Promise<boolean>}
     */
    static async remove(userId, productId) {
        const { error } = await supabase
            .from('recently_viewed')
            .delete()
            .eq('user_id', userId)
            .eq('product_id', productId);

        if (error) throw error;
        return true;
    }

    /**
     * Get count of recently viewed products
     * @param {string} userId
     * @returns {Promise<number>}
     */
    static async getCount(userId) {
        const { count, error } = await supabase
            .from('recently_viewed')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId);

        if (error) {
            console.error('Error getting recently viewed count:', error);
            return 0;
        }

        return count || 0;
    }
}

module.exports = RecentlyViewed;
