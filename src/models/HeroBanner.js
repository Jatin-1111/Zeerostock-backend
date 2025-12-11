const { supabase } = require('../config/database');

/**
 * HeroBanner Model
 * Handles homepage hero banners and carousel slides
 */
class HeroBanner {
    /**
     * Get all active hero banners
     * @returns {Promise<Array>}
     */
    static async getActive() {
        const { data, error } = await supabase
            .from('hero_banners')
            .select('id, title, subtitle, image_url, mobile_image_url, cta_text, cta_url, cta_type, banner_type, background_color, text_color, display_order')
            .eq('is_active', true)
            .or('start_date.is.null,start_date.lte.' + new Date().toISOString())
            .or('end_date.is.null,end_date.gte.' + new Date().toISOString())
            .order('display_order', { ascending: true })
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    }

    /**
     * Get banner by ID
     * @param {string} bannerId
     * @returns {Promise<Object>}
     */
    static async findById(bannerId) {
        const { data, error } = await supabase
            .from('hero_banners')
            .select('*')
            .eq('id', bannerId)
            .eq('is_active', true)
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Track banner impression
     * @param {string} bannerId
     * @returns {Promise<void>}
     */
    static async trackImpression(bannerId) {
        const query = `
            UPDATE hero_banners 
            SET impressions_count = impressions_count + 1
            WHERE id = $1
        `;

        await pool.query(query, [bannerId]);
    }

    /**
     * Track banner click
     * @param {string} bannerId
     * @returns {Promise<void>}
     */
    static async trackClick(bannerId) {
        const query = `
            UPDATE hero_banners 
            SET clicks_count = clicks_count + 1
            WHERE id = $1
        `;

        await pool.query(query, [bannerId]);
    }
}

module.exports = HeroBanner;
