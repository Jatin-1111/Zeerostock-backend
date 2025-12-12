const { supabase } = require('../config/database');

/**
 * RecentSearch Model
 * Manages user search history (authenticated users only)
 */
class RecentSearch {
    /**
     * Get recent searches for a user
     * @param {string} userId - User ID
     * @param {number} limit - Maximum results (default: 10)
     * @returns {Promise<Array>} - Array of recent searches
     */
    static async getUserRecentSearches(userId, limit = 10) {
        try {
            const { data, error } = await supabase
                .from('recent_searches')
                .select(`
          id,
          query,
          results_count,
          filters_applied,
          clicked_product_id,
          searched_at,
          product:products!recent_searches_clicked_product_id_fkey(
            id,
            title,
            thumbnail_url,
            price
          )
        `)
                .eq('user_id', userId)
                .order('searched_at', { ascending: false })
                .limit(limit);

            if (error) throw error;

            return data || [];

        } catch (error) {
            console.error('Error fetching recent searches:', error);
            throw error;
        }
    }

    /**
     * Get unique recent search queries (deduplicated)
     * @param {string} userId - User ID
     * @param {number} limit - Maximum results (default: 10)
     * @returns {Promise<Array>} - Array of unique search queries
     */
    static async getUniqueRecentSearches(userId, limit = 10) {
        try {
            const { data, error } = await supabase
                .from('recent_searches')
                .select('query, normalized_query, searched_at')
                .eq('user_id', userId)
                .order('searched_at', { ascending: false });

            if (error) throw error;

            // Deduplicate by normalized_query, keep most recent
            const uniqueSearches = [];
            const seenQueries = new Set();

            for (const search of (data || [])) {
                if (!seenQueries.has(search.normalized_query)) {
                    uniqueSearches.push(search);
                    seenQueries.add(search.normalized_query);
                }
                if (uniqueSearches.length >= limit) break;
            }

            return uniqueSearches;

        } catch (error) {
            console.error('Error fetching unique recent searches:', error);
            throw error;
        }
    }

    /**
     * Save a search to user history
     * @param {string} userId - User ID
     * @param {string} query - Search query
     * @param {number} resultsCount - Number of results returned
     * @param {Object} filtersApplied - Filters that were applied
     * @returns {Promise<Object>} - Created search record
     */
    static async saveSearch(userId, query, resultsCount = 0, filtersApplied = null) {
        try {
            const normalizedQuery = query.toLowerCase().trim();

            const { data, error } = await supabase
                .from('recent_searches')
                .insert({
                    user_id: userId,
                    query,
                    normalized_query: normalizedQuery,
                    results_count: resultsCount,
                    filters_applied: filtersApplied,
                    searched_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) {
                // Ignore unique constraint violations (same query at same timestamp)
                if (error.code !== '23505') {
                    throw error;
                }
                return null;
            }

            return data;

        } catch (error) {
            console.error('Error saving search:', error);
            // Don't throw - saving history failure shouldn't break search
            return null;
        }
    }

    /**
     * Update search with clicked product
     * @param {string} searchId - Recent search ID
     * @param {string} productId - Product that was clicked
     * @returns {Promise<void>}
     */
    static async updateClickedProduct(searchId, productId) {
        try {
            const { error } = await supabase
                .from('recent_searches')
                .update({ clicked_product_id: productId })
                .eq('id', searchId);

            if (error) throw error;

        } catch (error) {
            console.error('Error updating clicked product:', error);
            // Don't throw
        }
    }

    /**
     * Delete a specific search from user history
     * @param {string} userId - User ID
     * @param {string} searchId - Search ID to delete
     * @returns {Promise<void>}
     */
    static async deleteSearch(userId, searchId) {
        try {
            const { error } = await supabase
                .from('recent_searches')
                .delete()
                .eq('id', searchId)
                .eq('user_id', userId); // Ensure user owns this search

            if (error) throw error;

        } catch (error) {
            console.error('Error deleting search:', error);
            throw error;
        }
    }

    /**
     * Clear all recent searches for a user
     * @param {string} userId - User ID
     * @returns {Promise<void>}
     */
    static async clearAllSearches(userId) {
        try {
            const { error } = await supabase
                .from('recent_searches')
                .delete()
                .eq('user_id', userId);

            if (error) throw error;

        } catch (error) {
            console.error('Error clearing searches:', error);
            throw error;
        }
    }

    /**
     * Get search history statistics for a user
     * @param {string} userId - User ID
     * @returns {Promise<Object>} - Search statistics
     */
    static async getUserSearchStats(userId) {
        try {
            // Total searches
            const { count: totalSearches, error: countError } = await supabase
                .from('recent_searches')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId);

            if (countError) throw countError;

            // Searches with clicks
            const { count: searchesWithClicks, error: clicksError } = await supabase
                .from('recent_searches')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId)
                .not('clicked_product_id', 'is', null);

            if (clicksError) throw clicksError;

            // Most searched queries
            const { data: topQueries, error: topError } = await supabase
                .from('recent_searches')
                .select('normalized_query')
                .eq('user_id', userId);

            if (topError) throw topError;

            // Count query frequencies
            const queryFrequency = {};
            (topQueries || []).forEach(item => {
                queryFrequency[item.normalized_query] = (queryFrequency[item.normalized_query] || 0) + 1;
            });

            const mostSearched = Object.entries(queryFrequency)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([query, count]) => ({ query, count }));

            return {
                totalSearches: totalSearches || 0,
                searchesWithClicks: searchesWithClicks || 0,
                clickThroughRate: totalSearches > 0
                    ? ((searchesWithClicks / totalSearches) * 100).toFixed(2)
                    : 0,
                mostSearchedQueries: mostSearched
            };

        } catch (error) {
            console.error('Error fetching search stats:', error);
            throw error;
        }
    }
}

module.exports = RecentSearch;
