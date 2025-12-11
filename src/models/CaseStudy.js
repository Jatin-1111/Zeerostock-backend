const { supabase } = require('../config/database');

/**
 * CaseStudy Model
 * Handles business case studies and success stories
 */
class CaseStudy {
    /**
     * Get all active case studies
     * @param {number} limit
     * @returns {Promise<Array>}
     */
    static async getActive(limit = 12) {
        const { data, error } = await supabase
            .from('case_studies')
            .select('*')
            .eq('is_active', true)
            .order('is_featured', { ascending: false })
            .order('published_date', { ascending: false })
            .order('display_order', { ascending: true })
            .limit(limit);

        if (error) {
            console.error('Error in getActive:', error);
            return [];
        }
        return data || [];
    }

    /**
     * Get featured case studies
     * @param {number} limit
     * @returns {Promise<Array>}
     */
    static async getFeatured(limit = 6) {
        const { data, error } = await supabase
            .from('case_studies')
            .select('*')
            .eq('is_active', true)
            .eq('is_featured', true)
            .order('published_date', { ascending: false })
            .order('display_order', { ascending: true })
            .limit(limit);

        if (error) {
            console.error('Error in getFeatured:', error);
            return [];
        }
        return data || [];
    }

    /**
     * Get case study by ID
     * @param {string} caseStudyId
     * @returns {Promise<Object>}
     */
    static async findById(caseStudyId) {
        const { data, error } = await supabase
            .from('case_studies')
            .select('*')
            .eq('id', caseStudyId)
            .eq('is_active', true)
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Get case studies by industry
     * @param {string} industry
     * @param {number} limit
     * @returns {Promise<Array>}
     */
    static async getByIndustry(industry, limit = 6) {
        const { data, error } = await supabase
            .from('case_studies')
            .select('*')
            .eq('is_active', true)
            .ilike('industry', `%${industry}%`)
            .order('published_date', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Error in getByIndustry:', error);
            return [];
        }
        return data || [];
    }

    /**
     * Get total recovery statistics
     * @returns {Promise<Object>}
     */
    static async getTotalRecoveryStats() {
        const query = `
            SELECT 
                COUNT(*) as total_case_studies,
                COALESCE(SUM(amount_recovered), 0) as total_recovered,
                COALESCE(SUM(amount_saved), 0) as total_saved,
                ROUND(AVG(savings_percent), 2) as average_savings_percent
            FROM case_studies
            WHERE is_active = true
        `;

        const result = await pool.query(query);
        return result.rows[0];
    }
}

module.exports = CaseStudy;
