const { supabase } = require('../config/database');

/**
 * Category Model
 * Handles all category-related database operations
 */
class Category {
    /**
     * Get all trending categories with stats
     * @param {number} limit - Number of categories to fetch
     * @returns {Promise<Array>}
     */
    static async getTrending(limit = 10) {
        const { data, error } = await supabase
            .from('categories')
            .select(`
                id,
                name,
                slug,
                image_url,
                listing_count,
                growth_percentage,
                display_order
            `)
            .eq('is_active', true)
            .eq('is_trending', true)
            .order('display_order', { ascending: true })
            .order('listing_count', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data || [];
    }

    /**
     * Get top categories by demand
     * @param {number} limit
     * @returns {Promise<Array>}
     */
    static async getTopByDemand(limit = 5) {
        const { data, error } = await supabase
            .from('categories')
            .select('*')
            .eq('is_active', true)
            .order('listing_count', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data || [];
    }

    /**
     * Get category by ID
     * @param {string} categoryId
     * @returns {Promise<Object>}
     */
    static async findById(categoryId) {
        const { data, error } = await supabase
            .from('categories')
            .select('*')
            .eq('id', categoryId)
            .eq('is_active', true)
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Get all active categories
     * @returns {Promise<Array>}
     */
    static async getAll() {
        const { data, error } = await supabase
            .from('categories')
            .select('id, name, slug, image_url, listing_count, growth_percentage, is_trending')
            .eq('is_active', true)
            .order('display_order', { ascending: true })
            .order('name', { ascending: true });

        if (error) throw error;
        return data || [];
    }
}

module.exports = Category;
