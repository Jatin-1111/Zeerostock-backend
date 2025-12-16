const { supabase } = require('../config/database');

/**
 * SupportTicket Model
 * Handles customer support tickets operations
 */
class SupportTicket {
    /**
     * Create a new support ticket
     * @param {Object} ticketData
     * @returns {Promise<Object>}
     */
    static async create(ticketData) {
        const { data, error } = await supabase
            .from('support_tickets')
            .insert([{
                ...ticketData,
                status: 'open'
            }])
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Get ticket by ID
     * @param {string} ticketId
     * @param {string} userId
     * @returns {Promise<Object>}
     */
    static async findById(ticketId, userId = null) {
        let query = supabase
            .from('support_tickets')
            .select(`
                *,
                users!support_tickets_user_id_fkey (
                    id,
                    first_name,
                    last_name,
                    business_email,
                    mobile
                ),
                assigned_user:users!support_tickets_assigned_to_fkey (
                    id,
                    first_name,
                    last_name
                ),
                orders (
                    order_number,
                    status
                ),
                products (
                    title,
                    slug
                )
            `)
            .eq('id', ticketId);

        if (userId) {
            query = query.eq('user_id', userId);
        }

        const { data, error } = await query.single();

        if (error) throw error;
        return data;
    }

    /**
     * Get user's tickets
     * @param {string} userId
     * @param {Object} options - {page, limit, status}
     * @returns {Promise<Object>}
     */
    static async getByUserId(userId, options = {}) {
        const { page = 1, limit = 10, status = null } = options;
        const offset = (page - 1) * limit;

        let query = supabase
            .from('support_tickets')
            .select('*', { count: 'exact' })
            .eq('user_id', userId);

        if (status) {
            query = query.eq('status', status);
        }

        const { data, error, count } = await query
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) throw error;

        return {
            tickets: data || [],
            pagination: {
                page,
                limit,
                total: count,
                totalPages: Math.ceil(count / limit)
            }
        };
    }

    /**
     * Update ticket
     * @param {string} ticketId
     * @param {Object} updateData
     * @returns {Promise<Object>}
     */
    static async update(ticketId, updateData) {
        const { data, error } = await supabase
            .from('support_tickets')
            .update(updateData)
            .eq('id', ticketId)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Close ticket
     * @param {string} ticketId
     * @param {string} userId
     * @returns {Promise<Object>}
     */
    static async close(ticketId, userId) {
        const { data, error } = await supabase
            .from('support_tickets')
            .update({
                status: 'closed',
                closed_at: new Date().toISOString()
            })
            .eq('id', ticketId)
            .eq('user_id', userId)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Reopen ticket
     * @param {string} ticketId
     * @param {string} userId
     * @returns {Promise<Object>}
     */
    static async reopen(ticketId, userId) {
        const { data, error } = await supabase
            .from('support_tickets')
            .update({
                status: 'open',
                closed_at: null
            })
            .eq('id', ticketId)
            .eq('user_id', userId)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Add message to ticket
     * @param {string} ticketId
     * @param {string} senderId
     * @param {string} message
     * @param {Array} attachments
     * @param {boolean} isInternal
     * @returns {Promise<Object>}
     */
    static async addMessage(ticketId, senderId, message, attachments = [], isInternal = false) {
        const { data, error } = await supabase
            .from('support_ticket_messages')
            .insert([{
                ticket_id: ticketId,
                sender_id: senderId,
                message,
                attachments,
                is_internal: isInternal
            }])
            .select()
            .single();

        if (error) throw error;

        // Update ticket's updated_at
        await supabase
            .from('support_tickets')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', ticketId);

        return data;
    }

    /**
     * Get ticket messages
     * @param {string} ticketId
     * @param {boolean} includeInternal
     * @returns {Promise<Array>}
     */
    static async getMessages(ticketId, includeInternal = false) {
        let query = supabase
            .from('support_ticket_messages')
            .select(`
                *,
                users (
                    id,
                    first_name,
                    last_name,
                    role
                )
            `)
            .eq('ticket_id', ticketId);

        if (!includeInternal) {
            query = query.eq('is_internal', false);
        }

        const { data, error } = await query
            .order('created_at', { ascending: true });

        if (error) throw error;
        return data || [];
    }

    /**
     * Rate ticket resolution
     * @param {string} ticketId
     * @param {string} userId
     * @param {number} rating
     * @param {string} feedback
     * @returns {Promise<Object>}
     */
    static async rate(ticketId, userId, rating, feedback = null) {
        const { data, error } = await supabase
            .from('support_tickets')
            .update({
                satisfaction_rating: rating,
                feedback
            })
            .eq('id', ticketId)
            .eq('user_id', userId)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Get ticket statistics for user
     * @param {string} userId
     * @returns {Promise<Object>}
     */
    static async getUserStats(userId) {
        const { data, error } = await supabase
            .from('support_tickets')
            .select('status')
            .eq('user_id', userId);

        if (error) {
            console.error('Error getting ticket stats:', error);
            return {
                total: 0,
                open: 0,
                in_progress: 0,
                resolved: 0,
                closed: 0
            };
        }

        const stats = {
            total: data.length,
            open: 0,
            in_progress: 0,
            resolved: 0,
            closed: 0
        };

        data.forEach(ticket => {
            if (stats.hasOwnProperty(ticket.status)) {
                stats[ticket.status]++;
            }
        });

        return stats;
    }
}

module.exports = SupportTicket;
