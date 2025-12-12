const { supabase } = require('../config/database');

/**
 * SearchAnalytics Model
 * Tracks detailed search analytics for business insights
 */
class SearchAnalytics {
    /**
     * Track a search event
     * @param {Object} eventData - Search event data
     * @returns {Promise<Object>} - Created analytics record
     */
    static async trackSearch(eventData) {
        try {
            const {
                userId = null,
                sessionId = null,
                query,
                resultsCount = 0,
                filtersApplied = null,
                sortBy = 'relevance',
                page = 1,
                deviceType = 'desktop',
                userAgent = null,
                ipAddress = null,
                city = null,
                responseTimeMs = null,
                experimentVariant = null
            } = eventData;

            const normalizedQuery = query.toLowerCase().trim();

            const { data, error } = await supabase
                .from('search_analytics')
                .insert({
                    user_id: userId,
                    session_id: sessionId,
                    query,
                    normalized_query: normalizedQuery,
                    results_count: resultsCount,
                    filters_applied: filtersApplied,
                    sort_by: sortBy,
                    page,
                    device_type: deviceType,
                    user_agent: userAgent,
                    ip_address: ipAddress,
                    city,
                    response_time_ms: responseTimeMs,
                    experiment_variant: experimentVariant,
                    searched_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) throw error;

            return data;

        } catch (error) {
            console.error('Error tracking search:', error);
            // Don't throw - analytics failure shouldn't break search
            return null;
        }
    }

    /**
     * Track a product click from search results
     * @param {string} analyticsId - Search analytics record ID
     * @param {string} productId - Clicked product ID
     * @param {number} clickPosition - Position in results (1-based)
     * @param {number} timeToClick - Milliseconds from search to click
     * @returns {Promise<void>}
     */
    static async trackClick(analyticsId, productId, clickPosition, timeToClick) {
        try {
            const { error } = await supabase
                .from('search_analytics')
                .update({
                    clicked_product_id: productId,
                    click_position: clickPosition,
                    time_to_click: timeToClick,
                    clicked_at: new Date().toISOString()
                })
                .eq('id', analyticsId);

            if (error) throw error;

        } catch (error) {
            console.error('Error tracking click:', error);
            // Don't throw
        }
    }

    /**
     * Track add to cart from search
     * @param {string} analyticsId - Search analytics record ID
     * @returns {Promise<void>}
     */
    static async trackAddToCart(analyticsId) {
        try {
            const { error } = await supabase
                .from('search_analytics')
                .update({ added_to_cart: true })
                .eq('id', analyticsId);

            if (error) throw error;

        } catch (error) {
            console.error('Error tracking add to cart:', error);
            // Don't throw
        }
    }

    /**
     * Track conversion (order placed) from search
     * @param {string} analyticsId - Search analytics record ID
     * @returns {Promise<void>}
     */
    static async trackConversion(analyticsId) {
        try {
            const { error } = await supabase
                .from('search_analytics')
                .update({
                    converted_to_order: true,
                    added_to_cart: true // Assume cart addition if order placed
                })
                .eq('id', analyticsId);

            if (error) throw error;

        } catch (error) {
            console.error('Error tracking conversion:', error);
            // Don't throw
        }
    }

    /**
     * Get search performance analytics for a date range
     * @param {Date} startDate - Start date
     * @param {Date} endDate - End date
     * @returns {Promise<Object>} - Performance metrics
     */
    static async getPerformanceAnalytics(startDate, endDate) {
        try {
            const { data, error } = await supabase
                .from('search_analytics')
                .select('*')
                .gte('searched_at', startDate.toISOString())
                .lte('searched_at', endDate.toISOString());

            if (error) throw error;

            const analytics = data || [];

            // Calculate metrics
            const totalSearches = analytics.length;
            const searchesWithResults = analytics.filter(s => s.results_count > 0).length;
            const searchesWithClicks = analytics.filter(s => s.clicked_product_id !== null).length;
            const searchesWithCart = analytics.filter(s => s.added_to_cart).length;
            const searchesWithConversion = analytics.filter(s => s.converted_to_order).length;

            const avgResultsCount = totalSearches > 0
                ? analytics.reduce((sum, s) => sum + s.results_count, 0) / totalSearches
                : 0;

            const avgResponseTime = analytics
                .filter(s => s.response_time_ms !== null)
                .reduce((sum, s, _, arr) => sum + s.response_time_ms / arr.length, 0) || 0;

            const avgTimeToClick = analytics
                .filter(s => s.time_to_click !== null)
                .reduce((sum, s, _, arr) => sum + s.time_to_click / arr.length, 0) || 0;

            return {
                totalSearches,
                searchesWithResults,
                searchesWithClicks,
                searchesWithCart,
                searchesWithConversion,
                zeroResultsRate: totalSearches > 0
                    ? (((totalSearches - searchesWithResults) / totalSearches) * 100).toFixed(2)
                    : 0,
                clickThroughRate: totalSearches > 0
                    ? ((searchesWithClicks / totalSearches) * 100).toFixed(2)
                    : 0,
                addToCartRate: searchesWithClicks > 0
                    ? ((searchesWithCart / searchesWithClicks) * 100).toFixed(2)
                    : 0,
                conversionRate: searchesWithClicks > 0
                    ? ((searchesWithConversion / searchesWithClicks) * 100).toFixed(2)
                    : 0,
                avgResultsCount: avgResultsCount.toFixed(2),
                avgResponseTime: avgResponseTime.toFixed(2),
                avgTimeToClick: avgTimeToClick.toFixed(2)
            };

        } catch (error) {
            console.error('Error getting performance analytics:', error);
            throw error;
        }
    }

    /**
     * Get top searched queries for a date range
     * @param {Date} startDate - Start date
     * @param {Date} endDate - End date
     * @param {number} limit - Maximum results (default: 20)
     * @returns {Promise<Array>} - Top queries with metrics
     */
    static async getTopQueries(startDate, endDate, limit = 20) {
        try {
            const { data, error } = await supabase
                .from('search_analytics')
                .select('normalized_query, clicked_product_id')
                .gte('searched_at', startDate.toISOString())
                .lte('searched_at', endDate.toISOString());

            if (error) throw error;

            // Aggregate by query
            const queryStats = {};
            (data || []).forEach(item => {
                const query = item.normalized_query;
                if (!queryStats[query]) {
                    queryStats[query] = { query, searches: 0, clicks: 0 };
                }
                queryStats[query].searches++;
                if (item.clicked_product_id) {
                    queryStats[query].clicks++;
                }
            });

            // Calculate CTR and sort
            const topQueries = Object.values(queryStats)
                .map(stat => ({
                    ...stat,
                    ctr: stat.searches > 0
                        ? ((stat.clicks / stat.searches) * 100).toFixed(2)
                        : 0
                }))
                .sort((a, b) => b.searches - a.searches)
                .slice(0, limit);

            return topQueries;

        } catch (error) {
            console.error('Error getting top queries:', error);
            throw error;
        }
    }

    /**
     * Get queries with zero results
     * @param {Date} startDate - Start date
     * @param {Date} endDate - End date
     * @param {number} limit - Maximum results (default: 20)
     * @returns {Promise<Array>} - Queries that returned no results
     */
    static async getZeroResultQueries(startDate, endDate, limit = 20) {
        try {
            const { data, error } = await supabase
                .from('search_analytics')
                .select('query, normalized_query, searched_at')
                .eq('results_count', 0)
                .gte('searched_at', startDate.toISOString())
                .lte('searched_at', endDate.toISOString())
                .order('searched_at', { ascending: false })
                .limit(limit);

            if (error) throw error;

            return data || [];

        } catch (error) {
            console.error('Error getting zero result queries:', error);
            throw error;
        }
    }

    /**
     * Get device type breakdown
     * @param {Date} startDate - Start date
     * @param {Date} endDate - End date
     * @returns {Promise<Object>} - Device type statistics
     */
    static async getDeviceBreakdown(startDate, endDate) {
        try {
            const { data, error } = await supabase
                .from('search_analytics')
                .select('device_type')
                .gte('searched_at', startDate.toISOString())
                .lte('searched_at', endDate.toISOString());

            if (error) throw error;

            const breakdown = { mobile: 0, tablet: 0, desktop: 0 };
            (data || []).forEach(item => {
                const deviceType = item.device_type || 'desktop';
                breakdown[deviceType] = (breakdown[deviceType] || 0) + 1;
            });

            const total = data.length;
            return {
                mobile: { count: breakdown.mobile, percentage: total > 0 ? ((breakdown.mobile / total) * 100).toFixed(2) : 0 },
                tablet: { count: breakdown.tablet, percentage: total > 0 ? ((breakdown.tablet / total) * 100).toFixed(2) : 0 },
                desktop: { count: breakdown.desktop, percentage: total > 0 ? ((breakdown.desktop / total) * 100).toFixed(2) : 0 }
            };

        } catch (error) {
            console.error('Error getting device breakdown:', error);
            throw error;
        }
    }

    /**
     * Get filter usage statistics
     * @param {Date} startDate - Start date
     * @param {Date} endDate - End date
     * @returns {Promise<Object>} - Filter usage stats
     */
    static async getFilterUsage(startDate, endDate) {
        try {
            const { data, error } = await supabase
                .from('search_analytics')
                .select('filters_applied')
                .gte('searched_at', startDate.toISOString())
                .lte('searched_at', endDate.toISOString())
                .not('filters_applied', 'is', null);

            if (error) throw error;

            const filterCounts = {};
            (data || []).forEach(item => {
                const filters = item.filters_applied || {};
                Object.keys(filters).forEach(filterKey => {
                    filterCounts[filterKey] = (filterCounts[filterKey] || 0) + 1;
                });
            });

            const totalWithFilters = data.length;
            return Object.entries(filterCounts)
                .map(([filter, count]) => ({
                    filter,
                    count,
                    percentage: totalWithFilters > 0
                        ? ((count / totalWithFilters) * 100).toFixed(2)
                        : 0
                }))
                .sort((a, b) => b.count - a.count);

        } catch (error) {
            console.error('Error getting filter usage:', error);
            throw error;
        }
    }
}

module.exports = SearchAnalytics;
