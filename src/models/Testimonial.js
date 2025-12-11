const { supabase } = require('../config/database');

/**
 * Testimonial Model
 * Handles customer testimonials and reviews
 */
class Testimonial {
    /**
     * Get all active testimonials
     * @param {number} limit
     * @returns {Promise<Array>}
     */
    static async getActive(limit = 12) {
        const { data, error } = await supabase
            .from('testimonials')
            .select('*')
            .eq('is_active', true)
            .order('is_featured', { ascending: false })
            .order('rating', { ascending: false })
            .order('display_order', { ascending: true })
            .limit(limit);

        if (error) {
            console.error('Error in getActive:', error);
            return [];
        }
        return data || [];
    }

    /**
     * Get featured testimonials
     * @param {number} limit
     * @returns {Promise<Array>}
     */
    static async getFeatured(limit = 6) {
        const { data, error } = await supabase
            .from('testimonials')
            .select('*')
            .eq('is_active', true)
            .eq('is_featured', true)
            .order('rating', { ascending: false })
            .order('display_order', { ascending: true })
            .limit(limit);

        if (error) {
            console.error('Error in getFeatured:', error);
            return [];
        }
        return data || [];
    }

    /**
     * Get testimonial by ID
     * @param {string} testimonialId
     * @returns {Promise<Object>}
     */
    static async findById(testimonialId) {
        const { data, error } = await supabase
            .from('testimonials')
            .select('*')
            .eq('id', testimonialId)
            .eq('is_active', true)
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Get average rating
     * @returns {Promise<number>}
     */
    static async getAverageRating() {
        const { data, error } = await supabase
            .from('testimonials')
            .select('rating')
            .eq('is_active', true)
            .not('rating', 'is', null);

        if (error || !data || data.length === 0) return 0;

        const sum = data.reduce((acc, item) => acc + item.rating, 0);
        return Math.round((sum / data.length) * 100) / 100;
    }
}

module.exports = Testimonial;
