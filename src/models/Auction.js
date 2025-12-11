const { supabase } = require('../config/database');

/**
 * Auction Model
 * Handles live auction operations
 */
class Auction {
    /**
     * Get all live auctions
     * @param {number} limit
     * @returns {Promise<Array>}
     */
    static async getLiveAuctions(limit = 12) {
        const { data, error } = await supabase
            .from('auctions')
            .select('*')
            .eq('status', 'live')
            .order('end_time', { ascending: true })
            .order('total_bids', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Error in getLiveAuctions:', error);
            return [];
        }
        return data || [];
    }

    /**
     * Get upcoming auctions
     * @param {number} limit
     * @returns {Promise<Array>}
     */
    static async getUpcoming(limit = 12) {
        const { data, error } = await supabase
            .from('auctions')
            .select('*')
            .eq('status', 'upcoming')
            .order('start_time', { ascending: true })
            .limit(limit);

        if (error) {
            console.error('Error in getUpcoming:', error);
            return [];
        }
        return data || [];
    }

    /**
     * Get auction by ID
     * @param {string} auctionId
     * @returns {Promise<Object>}
     */
    static async findById(auctionId) {
        const { data, error } = await supabase
            .from('auctions')
            .select('*')
            .eq('id', auctionId)
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Get auction count by status
     * @returns {Promise<Object>}
     */
    static async getCountsByStatus() {
        const { count: liveCount } = await supabase
            .from('auctions')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'live');

        const { count: upcomingCount } = await supabase
            .from('auctions')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'upcoming');

        const { count: endedCount } = await supabase
            .from('auctions')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'ended');

        return {
            live_count: liveCount || 0,
            upcoming_count: upcomingCount || 0,
            ended_count: endedCount || 0
        };
    }

    /**
     * Get hot auctions (most bids/bidders)
     * @param {number} limit
     * @returns {Promise<Array>}
     */
    static async getHotAuctions(limit = 6) {
        const { data, error } = await supabase
            .from('auctions')
            .select('*')
            .eq('status', 'live')
            .order('total_bids', { ascending: false })
            .order('total_bidders', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Error in getHotAuctions:', error);
            return [];
        }
        return data || [];
    }
}

module.exports = Auction;
