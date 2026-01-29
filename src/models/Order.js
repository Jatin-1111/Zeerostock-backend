const { supabase } = require('../config/database');

/**
 * Order Model
 * Handles order operations for B2B marketplace
 */
class Order {
    /**
     * Create a new order
     * @param {Object} orderData
     * @returns {Promise<Object>}
     */
    static async create(orderData) {
        const { data, error } = await supabase
            .from('orders')
            .insert([orderData])
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Get order by ID
     * @param {string} orderId
     * @returns {Promise<Object>}
     */
    static async findById(orderId) {
        const { data, error } = await supabase
            .from('orders')
            .select(`
                *,
                order_items (
                    *
                ),
                order_tracking (
                    *
                )
            `)
            .eq('id', orderId)
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Get buyer's active orders
     * @param {string} userId
     * @param {Object} options - {page, limit}
     * @returns {Promise<Array>}
     */
    static async getActiveOrders(userId, options = {}) {
        const { page = 1, limit = 10 } = options;
        const offset = (page - 1) * limit;

        const { data, error, count } = await supabase
            .from('orders')
            .select(`
                *,
                order_items (
                    id,
                    product_title,
                    product_image,
                    quantity,
                    final_price,
                    subtotal,
                    item_status,
                    supplier_id,
                    supplier_name,
                    supplier_city
                )
            `, { count: 'exact' })
            .eq('user_id', userId)
            .in('status', ['pending', 'confirmed', 'processing', 'shipped'])
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) throw error;

        return {
            orders: data || [],
            pagination: {
                page,
                limit,
                total: count,
                totalPages: Math.ceil(count / limit)
            }
        };
    }

    /**
     * Get buyer's order history
     * @param {string} userId
     * @param {Object} options - {page, limit, status}
     * @returns {Promise<Object>}
     */
    static async getOrderHistory(userId, options = {}) {
        const { page = 1, limit = 10, status = null } = options;
        const offset = (page - 1) * limit;

        let query = supabase
            .from('orders')
            .select(`
                *,
                order_items (
                    id,
                    product_title,
                    product_image,
                    quantity,
                    final_price,
                    subtotal,
                    item_status,
                    supplier_id,
                    supplier_name,
                    supplier_city
                )
            `, { count: 'exact' })
            .eq('user_id', userId);

        if (status) {
            query = query.eq('status', status);
        }

        const { data, error, count } = await query
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) throw error;

        return {
            orders: data || [],
            pagination: {
                page,
                limit,
                total: count,
                totalPages: Math.ceil(count / limit)
            }
        };
    }

    /**
     * Get order with tracking info
     * @param {string} orderIdOrNumber - Order ID (UUID) or Order number (e.g., ORD-2025-000005)
     * @param {string} userId
     * @returns {Promise<Object>}
     */
    static async getOrderWithTracking(orderIdOrNumber, userId) {
        // Check if it's a UUID (contains hyphens in UUID format) or order number
        const isUuid = orderIdOrNumber.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

        let query = supabase
            .from('orders')
            .select(`
                *,
                order_items (*),
                order_tracking (*)
            `);

        if (isUuid) {
            query = query.eq('id', orderIdOrNumber);
        } else {
            query = query.eq('order_number', orderIdOrNumber);
        }

        const { data, error } = await query
            .eq('user_id', userId)
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Update order
     * @param {string} orderId
     * @param {Object} updateData
     * @returns {Promise<Object>}
     */
    static async update(orderId, updateData) {
        const { data, error } = await supabase
            .from('orders')
            .update(updateData)
            .eq('id', orderId)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Cancel order
     * @param {string} orderId
     * @param {string} userId
     * @param {string} reason
     * @returns {Promise<Object>}
     */
    static async cancelOrder(orderId, userId, reason) {
        const { data, error } = await supabase
            .from('orders')
            .update({
                status: 'cancelled',
                cancellation_reason: reason,
                cancelled_by: userId,
                cancelled_at: new Date().toISOString()
            })
            .eq('id', orderId)
            .eq('user_id', userId)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Add tracking update
     * @param {string} orderId
     * @param {Object} trackingData
     * @returns {Promise<Object>}
     */
    static async addTracking(orderId, trackingData) {
        const { data, error } = await supabase
            .from('order_tracking')
            .insert([{
                order_id: orderId,
                ...trackingData
            }])
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Get order tracking history
     * @param {string} orderId
     * @returns {Promise<Array>}
     */
    static async getTracking(orderId) {
        const { data, error } = await supabase
            .from('order_tracking')
            .select('*')
            .eq('order_id', orderId)
            .order('created_at', { ascending: true });

        if (error) throw error;
        return data || [];
    }

    /**
     * Get buyer order statistics
     * @param {string} userId
     * @returns {Promise<Object>}
     */
    static async getBuyerStats(userId) {
        const { data, error } = await supabase
            .rpc('get_buyer_order_stats', { buyer_user_id: userId });

        if (error) {
            console.error('Error getting buyer stats:', error);
            return {
                total_orders: 0,
                active_orders: 0,
                completed_orders: 0,
                cancelled_orders: 0,
                total_spent: 0,
                average_order_value: 0
            };
        }

        return data[0] || {
            total_orders: 0,
            active_orders: 0,
            completed_orders: 0,
            cancelled_orders: 0,
            total_spent: 0,
            average_order_value: 0
        };
    }

    /**
     * ADMIN METHODS
     */

    /**
     * Get all orders for admin with filters
     * @param {Object} options - {page, limit, status, search, sortBy, sortOrder}
     * @returns {Promise<Object>}
     */
    static async getAllOrdersAdmin(options = {}) {
        const {
            page = 1,
            limit = 50,
            status = null,
            search = null,
            sortBy = 'created_at',
            sortOrder = 'desc'
        } = options;

        const offset = (page - 1) * limit;

        let query = supabase
            .from('orders')
            .select(`
                *,
                order_items (
                    id,
                    product_title,
                    quantity,
                    final_price,
                    subtotal,
                    item_status
                )
            `, { count: 'exact' });

        // Apply status filter
        if (status && status !== 'all') {
            query = query.eq('status', status);
        }

        // Apply search filter (order number or buyer email)
        if (search) {
            query = query.or(`order_number.ilike.%${search}%,shipping_address->>email.ilike.%${search}%`);
        }

        // Apply sorting
        query = query.order(sortBy, { ascending: sortOrder === 'asc' });

        // Apply pagination
        const { data, error, count } = await query.range(offset, offset + limit - 1);

        if (error) throw error;

        return {
            orders: data || [],
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: count,
                totalPages: Math.ceil(count / limit)
            }
        };
    }

    /**
     * Get order statistics for admin
     * @returns {Promise<Object>}
     */
    static async getAdminStats() {
        // Run parallel queries efficiently
        const [
            { count: totalOrders },
            { count: pending },
            { count: processing },
            { count: shipped },
            { count: inTransit },
            { count: delivered },
            { count: cancelled },
            { count: deliveryIssues },
            { data: revenueData }
        ] = await Promise.all([
            supabase.from('orders').select('*', { count: 'exact', head: true }),
            supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
            supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'processing'),
            supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'shipped'),
            supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'in_transit'),
            supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'delivered'),
            supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'cancelled'),
            supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'issue'),
            // For revenue, we ideally want a SUM query, but Supabase JS doesn't support aggregate functions directly without RPC.
            // fetching only total_amount is lighter than fetching everything.
            supabase.from('orders').select('total_amount')
        ]);

        // Calculate derived stats
        const pendingDispatch = (pending || 0) + (await supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'confirmed').then(res => res.count || 0));

        // Calculate revenue in memory (still requires fetching amounts, but payload is just one column)
        // If optimizing further, we should create a 'get_total_revenue' RPC function in the database.
        const totalRevenue = (revenueData || []).reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);

        return {
            totalOrders: totalOrders || 0,
            pending: pending || 0,
            processing: processing || 0,
            shipped: shipped || 0,
            inTransit: inTransit || 0,
            delivered: delivered || 0,
            cancelled: cancelled || 0,
            pendingDispatch: pendingDispatch || 0,
            deliveryIssues: deliveryIssues || 0,
            totalRevenue
        };
    }

    /**
     * Get order by ID for admin (no user restriction)
     * @param {string} orderId
     * @returns {Promise<Object>}
     */
    static async getOrderByIdAdmin(orderId) {
        const { data, error } = await supabase
            .from('orders')
            .select(`
                *,
                order_items (*),
                order_tracking (*)
            `)
            .eq('id', orderId)
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Update order status (admin)
     * @param {string} orderId
     * @param {string} status
     * @param {string} notes
     * @returns {Promise<Object>}
     */
    static async updateOrderStatus(orderId, status, notes = null) {
        const { data, error } = await supabase
            .from('orders')
            .update({
                status,
                updated_at: new Date().toISOString()
            })
            .eq('id', orderId)
            .select()
            .single();

        if (error) throw error;

        // Add tracking entry
        if (notes) {
            await supabase.from('order_tracking').insert({
                order_id: orderId,
                status,
                title: `Order ${status.replace('_', ' ')}`,
                description: notes,
                is_milestone: true
            });
        }

        return data;
    }
}

module.exports = Order;
