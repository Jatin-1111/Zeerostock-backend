const { supabase } = require('../config/database');

/**
 * Notification Model
 * Handles user notifications operations
 */
class Notification {
    /**
     * Create a new notification
     * @param {Object} notificationData
     * @returns {Promise<Object>}
     */
    static async create(notificationData) {
        const { data, error } = await supabase
            .from('notifications')
            .insert([notificationData])
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Create multiple notifications
     * @param {Array} notifications
     * @returns {Promise<Array>}
     */
    static async createBulk(notifications) {
        const { data, error } = await supabase
            .from('notifications')
            .insert(notifications)
            .select();

        if (error) throw error;
        return data;
    }

    /**
     * Get user notifications
     * @param {string} userId
     * @param {Object} options - {page, limit, type, unreadOnly}
     * @returns {Promise<Object>}
     */
    static async getByUserId(userId, options = {}) {
        const { page = 1, limit = 20, type = null, unreadOnly = false } = options;
        const offset = (page - 1) * limit;

        let query = supabase
            .from('notifications')
            .select('*', { count: 'exact' })
            .eq('user_id', userId);

        if (type) {
            query = query.eq('type', type);
        }

        if (unreadOnly) {
            query = query.eq('is_read', false);
        }

        const { data, error, count } = await query
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) throw error;

        return {
            notifications: data || [],
            pagination: {
                page,
                limit,
                total: count,
                totalPages: Math.ceil(count / limit)
            }
        };
    }

    /**
     * Mark notification as read
     * @param {string} notificationId
     * @param {string} userId
     * @returns {Promise<Object>}
     */
    static async markAsRead(notificationId, userId) {
        const { data, error } = await supabase
            .from('notifications')
            .update({
                is_read: true,
                read_at: new Date().toISOString()
            })
            .eq('id', notificationId)
            .eq('user_id', userId)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Mark all notifications as read
     * @param {string} userId
     * @returns {Promise<boolean>}
     */
    static async markAllAsRead(userId) {
        const { error } = await supabase
            .from('notifications')
            .update({
                is_read: true,
                read_at: new Date().toISOString()
            })
            .eq('user_id', userId)
            .eq('is_read', false);

        if (error) throw error;
        return true;
    }

    /**
     * Delete notification
     * @param {string} notificationId
     * @param {string} userId
     * @returns {Promise<boolean>}
     */
    static async delete(notificationId, userId) {
        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('id', notificationId)
            .eq('user_id', userId);

        if (error) throw error;
        return true;
    }

    /**
     * Get unread count
     * @param {string} userId
     * @returns {Promise<number>}
     */
    static async getUnreadCount(userId) {
        const { count, error } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('is_read', false);

        if (error) {
            console.error('Error getting unread count:', error);
            return 0;
        }

        return count || 0;
    }

    /**
     * Delete old notifications
     * @param {string} userId
     * @param {number} daysOld
     * @returns {Promise<number>}
     */
    static async deleteOld(userId, daysOld = 30) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);

        const { data, error } = await supabase
            .from('notifications')
            .delete()
            .eq('user_id', userId)
            .eq('is_read', true)
            .lt('created_at', cutoffDate.toISOString())
            .select('id');

        if (error) throw error;
        return data?.length || 0;
    }

    /**
     * Send order notification
     * @param {string} userId
     * @param {string} orderId
     * @param {string} type
     * @param {string} title
     * @param {string} message
     * @returns {Promise<Object>}
     */
    static async sendOrderNotification(userId, orderId, type, title, message) {
        return this.create({
            user_id: userId,
            type,
            title,
            message,
            resource_type: 'order',
            resource_id: orderId,
            action_url: `/buyer/orders/${orderId}`,
            priority: 'high'
        });
    }

    /**
     * Send price drop notification
     * @param {string} userId
     * @param {string} productId
     * @param {string} productTitle
     * @param {number} oldPrice
     * @param {number} newPrice
     * @returns {Promise<Object>}
     */
    static async sendPriceDropNotification(userId, productId, productTitle, oldPrice, newPrice) {
        const discount = Math.round(((oldPrice - newPrice) / oldPrice) * 100);

        return this.create({
            user_id: userId,
            type: 'price_drop',
            title: `Price Drop Alert: ${productTitle}`,
            message: `Price dropped by ${discount}% from ₹${oldPrice} to ₹${newPrice}`,
            resource_type: 'product',
            resource_id: productId,
            action_url: `/products/${productId}`,
            priority: 'normal',
            data: {
                oldPrice,
                newPrice,
                discount
            }
        });
    }

    /**
     * Send auction notification
     * @param {string} userId
     * @param {string} auctionId
     * @param {string} type
     * @param {string} title
     * @param {string} message
     * @returns {Promise<Object>}
     */
    static async sendAuctionNotification(userId, auctionId, type, title, message) {
        return this.create({
            user_id: userId,
            type,
            title,
            message,
            resource_type: 'auction',
            resource_id: auctionId,
            action_url: `/auctions/${auctionId}`,
            priority: type === 'auction_ending' ? 'urgent' : 'high'
        });
    }
}

module.exports = Notification;
