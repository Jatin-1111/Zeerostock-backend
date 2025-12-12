const { supabase } = require('../config/database');

/**
 * PopularSearch Model
 * Manages trending and popular search terms
 */
class PopularSearch {
    /**
     * Get popular searches (all-time)
     * @param {number} limit - Maximum results (default: 10)
     * @returns {Promise<Array>} - Array of popular searches
     */
    static async getPopular(limit = 10) {
        try {
            const { data, error } = await supabase
                .from('popular_searches')
                .select('query, total_searches, last_searched_at')
                .order('total_searches', { ascending: false })
                .limit(limit);

            if (error) throw error;

            return data || [];

        } catch (error) {
            console.error('Error fetching popular searches:', error);
            throw error;
        }
    }

    /**
     * Get trending searches (based on recent activity)
     * @param {number} limit - Maximum results (default: 10)
     * @returns {Promise<Array>} - Array of trending searches
     */
    static async getTrending(limit = 10) {
        try {
            const { data, error } = await supabase
                .from('popular_searches')
                .select('query, trending_score, searches_today, searches_this_week, last_searched_at')
                .gte('last_searched_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days
                .order('trending_score', { ascending: false })
                .limit(limit);

            if (error) throw error;

            return data || [];

        } catch (error) {
            console.error('Error fetching trending searches:', error);
            throw error;
        }
    }

    /**
     * Get searches from today
     * @param {number} limit - Maximum results (default: 10)
     * @returns {Promise<Array>} - Array of today's searches
     */
    static async getToday(limit = 10) {
        try {
            const { data, error } = await supabase
                .from('popular_searches')
                .select('query, searches_today, total_searches')
                .gt('searches_today', 0)
                .order('searches_today', { ascending: false })
                .limit(limit);

            if (error) throw error;

            return data || [];

        } catch (error) {
            console.error('Error fetching today\'s searches:', error);
            throw error;
        }
    }

    /**
     * Get searches from this week
     * @param {number} limit - Maximum results (default: 10)
     * @returns {Promise<Array>} - Array of this week's searches
     */
    static async getThisWeek(limit = 10) {
        try {
            const { data, error } = await supabase
                .from('popular_searches')
                .select('query, searches_this_week, total_searches')
                .gt('searches_this_week', 0)
                .order('searches_this_week', { ascending: false })
                .limit(limit);

            if (error) throw error;

            return data || [];

        } catch (error) {
            console.error('Error fetching this week\'s searches:', error);
            throw error;
        }
    }

    /**
     * Get search by query
     * @param {string} query - Search query
     * @returns {Promise<Object|null>} - Popular search record or null
     */
    static async getByQuery(query) {
        try {
            const normalizedQuery = query.toLowerCase().trim();

            const { data, error } = await supabase
                .from('popular_searches')
                .select('*')
                .eq('normalized_query', normalizedQuery)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    // No rows returned
                    return null;
                }
                throw error;
            }

            return data;

        } catch (error) {
            console.error('Error fetching search by query:', error);
            throw error;
        }
    }

    /**
     * Increment search count for a query
     * Called by SearchIndex.trackSearchQuery via RPC function
     * This method is mainly for manual tracking if needed
     * @param {string} query - Search query
     * @returns {Promise<void>}
     */
    static async incrementSearchCount(query) {
        try {
            const normalizedQuery = query.toLowerCase().trim();

            // Check if exists
            const existing = await this.getByQuery(query);

            if (existing) {
                // Update counts
                const { error } = await supabase
                    .from('popular_searches')
                    .update({
                        total_searches: existing.total_searches + 1,
                        searches_today: existing.searches_today + 1,
                        searches_this_week: existing.searches_this_week + 1,
                        searches_this_month: existing.searches_this_month + 1,
                        last_searched_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', existing.id);

                if (error) throw error;

                // Update trending score
                await this.updateTrendingScores();

            } else {
                // Create new record
                const { error } = await supabase
                    .from('popular_searches')
                    .insert({
                        query,
                        normalized_query: normalizedQuery,
                        total_searches: 1,
                        searches_today: 1,
                        searches_this_week: 1,
                        searches_this_month: 1,
                        last_searched_at: new Date().toISOString()
                    });

                if (error) throw error;
            }

        } catch (error) {
            console.error('Error incrementing search count:', error);
            // Don't throw - tracking failure shouldn't break search
        }
    }

    /**
     * Update trending scores for all searches
     * Trending score = (searches_today * 10) + (searches_this_week * 2) + (searches_this_month * 0.5)
     * @returns {Promise<void>}
     */
    static async updateTrendingScores() {
        try {
            await supabase.rpc('update_trending_scores');
        } catch (error) {
            console.error('Error updating trending scores:', error);
            // Don't throw
        }
    }

    /**
     * Reset daily search counts (run at midnight)
     * @returns {Promise<void>}
     */
    static async resetDailyCounts() {
        try {
            await supabase.rpc('reset_daily_search_counts');
        } catch (error) {
            console.error('Error resetting daily counts:', error);
            throw error;
        }
    }

    /**
     * Reset weekly search counts (run on Monday)
     * @returns {Promise<void>}
     */
    static async resetWeeklyCounts() {
        try {
            await supabase.rpc('reset_weekly_search_counts');
        } catch (error) {
            console.error('Error resetting weekly counts:', error);
            throw error;
        }
    }

    /**
     * Reset monthly search counts (run on 1st of month)
     * @returns {Promise<void>}
     */
    static async resetMonthlyCounts() {
        try {
            await supabase.rpc('reset_monthly_search_counts');
        } catch (error) {
            console.error('Error resetting monthly counts:', error);
            throw error;
        }
    }

    /**
     * Get search statistics
     * @returns {Promise<Object>} - Overall search statistics
     */
    static async getStatistics() {
        try {
            const { data, error } = await supabase
                .from('popular_searches')
                .select('total_searches, searches_today, searches_this_week, searches_this_month');

            if (error) throw error;

            const stats = {
                totalUniqueQueries: data.length,
                totalSearches: data.reduce((sum, item) => sum + item.total_searches, 0),
                searchesToday: data.reduce((sum, item) => sum + item.searches_today, 0),
                searchesThisWeek: data.reduce((sum, item) => sum + item.searches_this_week, 0),
                searchesThisMonth: data.reduce((sum, item) => sum + item.searches_this_month, 0)
            };

            return stats;

        } catch (error) {
            console.error('Error fetching search statistics:', error);
            throw error;
        }
    }
}

module.exports = PopularSearch;
