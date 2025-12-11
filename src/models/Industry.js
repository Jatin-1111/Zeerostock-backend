const { supabase } = require('../config/database');

/**
 * Industry Model
 * Handles industrial sectors and categories
 */
class Industry {
    /**
     * Get all active industries
     * @param {Object} options
     * @returns {Promise<Array>}
     */
    static async getAll(options = {}) {
        const { limit = 50, includeCount = true } = options;

        let query = supabase
            .from('industries')
            .select('*')
            .eq('is_active', true)
            .order('display_order', { ascending: true })
            .order('name', { ascending: true });

        if (limit) {
            query = query.limit(limit);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error in Industry.getAll:', error);
            return [];
        }

        return data || [];
    }

    /**
     * Get industry by ID
     * @param {string} industryId
     * @returns {Promise<Object>}
     */
    static async findById(industryId) {
        const { data, error } = await supabase
            .from('industries')
            .select('*')
            .eq('id', industryId)
            .eq('is_active', true)
            .single();

        if (error) {
            console.error('Error in Industry.findById:', error);
            return null;
        }

        return data;
    }

    /**
     * Get industry by slug
     * @param {string} slug
     * @returns {Promise<Object>}
     */
    static async findBySlug(slug) {
        const { data, error } = await supabase
            .from('industries')
            .select('*')
            .eq('slug', slug)
            .eq('is_active', true)
            .single();

        if (error) {
            console.error('Error in Industry.findBySlug:', error);
            return null;
        }

        return data;
    }

    /**
     * Get popular industries (with most products)
     * @param {number} limit
     * @returns {Promise<Array>}
     */
    static async getPopular(limit = 10) {
        const { data, error } = await supabase
            .from('industries')
            .select('*')
            .eq('is_active', true)
            .order('product_count', { ascending: false })
            .order('name', { ascending: true })
            .limit(limit);

        if (error) {
            console.error('Error in Industry.getPopular:', error);
            return [];
        }

        return data || [];
    }

    /**
     * Search industries by name
     * @param {string} query
     * @param {number} limit
     * @returns {Promise<Array>}
     */
    static async search(query, limit = 20) {
        const { data, error } = await supabase
            .from('industries')
            .select('*')
            .eq('is_active', true)
            .ilike('name', `%${query}%`)
            .order('product_count', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Error in Industry.search:', error);
            return [];
        }

        return data || [];
    }

    /**
     * Get industries with product counts
     * @returns {Promise<Array>}
     */
    static async getWithCounts() {
        const { data, error } = await supabase
            .from('industries')
            .select('id, name, slug, image_url, product_count')
            .eq('is_active', true)
            .gt('product_count', 0)
            .order('product_count', { ascending: false });

        if (error) {
            console.error('Error in Industry.getWithCounts:', error);
            return [];
        }

        return data || [];
    }
}

module.exports = Industry;
