const { supabase } = require('../config/database');

/**
 * MarketStats Model
 * Handles marketplace statistics and analytics
 */
class MarketStats {
    /**
     * Get today's market statistics
     * @returns {Promise<Object>}
     */
    static async getToday() {
        const { data, error } = await supabase
            .from('market_stats')
            .select('*')
            .eq('stat_date', new Date().toISOString().split('T')[0])
            .single();

        if (error) {
            console.error('Error in getToday:', error);
            return null;
        }
        return data;
    }

    /**
     * Create today's market stats (if not exists)
     * @returns {Promise<Object>}
     */
    static async createTodayStats() {
        const today = new Date().toISOString().split('T')[0];
        const { data, error } = await supabase
            .from('market_stats')
            .insert({ stat_date: today })
            .select()
            .single();

        if (error) {
            console.error('Error creating today stats:', error);
            return await this.getToday();
        }
        return data;
    }

    /**
     * Get quick stats for homepage
     * @returns {Promise<Object>}
     */
    static async getQuickStats() {
        try {
            const today = new Date().toISOString().split('T')[0];

            const { data, error } = await supabase
                .from('market_stats')
                .select('*')
                .eq('stat_date', today)
                .single();

            // If no stats found or error, return defaults
            if (error || !data) {
                console.log('No market stats found, returning defaults');
                return {
                    total_users: 10000,
                    total_transaction_volume: 50000000,
                    success_rate: 95,
                    active_listings: 1000,
                    live_auctions: 50,
                    volume_today: 1000000,
                    total_categories: 10,
                    verified_suppliers: 500,
                    average_rating: 4.5
                };
            }

            return data;
        } catch (error) {
            console.error('Error in getQuickStats:', error.message);
            // Return default stats if query fails
            return {
                total_users: 10000,
                total_transaction_volume: 50000000,
                success_rate: 95,
                active_listings: 1000,
                live_auctions: 50,
                volume_today: 1000000,
                total_categories: 10,
                verified_suppliers: 500,
                average_rating: 4.5
            };
        }
    }

    /**
     * Get market insights data
     * @returns {Promise<Object>}
     */
    static async getMarketInsights() {
        try {
            // Get today's market stats
            const { data: marketStats, error: statsError } = await supabase
                .from('market_stats')
                .select('*')
                .eq('stat_date', new Date().toISOString().split('T')[0])
                .single();

            if (statsError) {
                console.error('Error fetching market stats:', statsError);
            }

            // Get top categories insights
            const { data: topCategories, error: categoriesError } = await supabase
                .from('category_insights')
                .select(`
                    category_id,
                    demand_score,
                    trend_direction,
                    active_listings,
                    total_views,
                    categories (
                        id,
                        name
                    )
                `)
                .eq('insight_date', new Date().toISOString().split('T')[0])
                .order('demand_score', { ascending: false })
                .limit(5);

            if (categoriesError) {
                console.error('Error fetching categories:', categoriesError);
            }

            return {
                active_listings: marketStats?.active_listings || 0,
                live_auctions: marketStats?.live_auctions || 0,
                volume_today: marketStats?.volume_today || 0,
                transactions_today: marketStats?.transactions_today || 0,
                market_heat_index: marketStats?.market_heat_index || 50,
                demand_supply_ratio: marketStats?.demand_supply_ratio || 1.0,
                new_listings_today: marketStats?.new_listings_today || 0,
                new_signups_today: marketStats?.new_signups_today || 0,
                top_categories: topCategories || []
            };
        } catch (error) {
            console.error('Error in getMarketInsights:', error);
            return {
                active_listings: 1000,
                live_auctions: 50,
                volume_today: 1000000,
                transactions_today: 100,
                market_heat_index: 70,
                demand_supply_ratio: 1.2,
                new_listings_today: 50,
                new_signups_today: 20,
                top_categories: []
            };
        }
    }

    /**
     * Update user stats
     * @param {Object} stats
     * @returns {Promise<void>}
     */
    static async updateUserStats(stats) {
        const today = new Date().toISOString().split('T')[0];
        const { error } = await supabase
            .from('market_stats')
            .update({
                total_users: stats.totalUsers,
                active_users_today: stats.activeUsersToday,
                new_signups_today: stats.newSignupsToday,
                updated_at: new Date().toISOString()
            })
            .eq('stat_date', today);

        if (error) console.error('Error updating user stats:', error);
    }

    /**
     * Update transaction stats
     * @param {Object} stats
     * @returns {Promise<void>}
     */
    static async updateTransactionStats(stats) {
        const today = new Date().toISOString().split('T')[0];
        const { error } = await supabase
            .from('market_stats')
            .update({
                total_transaction_volume: stats.totalVolume,
                transactions_today: stats.transactionsToday,
                volume_today: stats.volumeToday,
                average_deal_size: stats.averageDealSize,
                updated_at: new Date().toISOString()
            })
            .eq('stat_date', today);

        if (error) console.error('Error updating transaction stats:', error);
    }

    /**
     * Update listing stats
     * @param {Object} stats
     * @returns {Promise<void>}
     */
    static async updateListingStats(stats) {
        const today = new Date().toISOString().split('T')[0];
        const { error } = await supabase
            .from('market_stats')
            .update({
                total_listings: stats.totalListings,
                active_listings: stats.activeListings,
                new_listings_today: stats.newListingsToday,
                updated_at: new Date().toISOString()
            })
            .eq('stat_date', today);

        if (error) console.error('Error updating listing stats:', error);
    }

    /**
     * Update auction stats
     * @param {Object} stats
     * @returns {Promise<void>}
     */
    static async updateAuctionStats(stats) {
        const today = new Date().toISOString().split('T')[0];
        const { error } = await supabase
            .from('market_stats')
            .update({
                total_auctions: stats.totalAuctions,
                live_auctions: stats.liveAuctions,
                auctions_today: stats.auctionsToday,
                updated_at: new Date().toISOString()
            })
            .eq('stat_date', today);

        if (error) console.error('Error updating auction stats:', error);
    }

    /**
     * Get historical stats
     * @param {number} days - Number of days to fetch
     * @returns {Promise<Array>}
     */
    static async getHistorical(days = 30) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const { data, error } = await supabase
            .from('market_stats')
            .select('stat_date, total_users, total_transaction_volume, volume_today, active_listings, live_auctions, success_rate')
            .gte('stat_date', startDate.toISOString().split('T')[0])
            .order('stat_date', { ascending: false });

        if (error) {
            console.error('Error fetching historical stats:', error);
            return [];
        }
        return data || [];
    }
}

module.exports = MarketStats;
