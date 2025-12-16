const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const NotificationService = require('../services/notification.service');

/**
 * Order Controllers
 * Handles all buyer order operations
 */

/**
 * GET /api/buyer/orders/active
 * Get buyer's active orders
 */
const getActiveOrders = async (req, res) => {
    try {
        const userId = req.user.id;
        const { page, limit } = req.query;

        const result = await Order.getActiveOrders(userId, { page, limit });

        res.json({
            success: true,
            message: 'Active orders retrieved successfully',
            data: result
        });

    } catch (error) {
        console.error('Error getting active orders:', error);
        res.status(500).json({
            success: false,
            errorCode: 'SERVER_ERROR',
            message: 'Failed to retrieve active orders'
        });
    }
};

/**
 * GET /api/buyer/orders/history
 * Get buyer's order history
 */
const getOrderHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        const { page, limit, status } = req.query;

        const result = await Order.getOrderHistory(userId, { page, limit, status });

        res.json({
            success: true,
            message: 'Order history retrieved successfully',
            data: result
        });

    } catch (error) {
        console.error('Error getting order history:', error);
        res.status(500).json({
            success: false,
            errorCode: 'SERVER_ERROR',
            message: 'Failed to retrieve order history'
        });
    }
};

/**
 * GET /api/buyer/orders/:orderId
 * Get specific order details
 */
const getOrderById = async (req, res) => {
    try {
        const userId = req.user.id;
        const { orderId } = req.params;

        const order = await Order.getOrderWithTracking(orderId, userId);

        if (!order) {
            return res.status(404).json({
                success: false,
                errorCode: 'ORDER_NOT_FOUND',
                message: 'Order not found'
            });
        }

        // Format the response
        const formattedOrder = {
            orderId: order.id,
            orderNumber: order.order_number,
            status: order.status,
            paymentStatus: order.payment_status,

            // Items
            items: order.order_items.map(item => ({
                itemId: item.id,
                productId: item.product_id,
                productTitle: item.product_title,
                productImage: item.product_image,
                productSku: item.product_sku,
                quantity: item.quantity,
                unitPrice: item.unit_price,
                discount: item.discount_amount,
                finalPrice: item.final_price,
                subtotal: item.subtotal,
                itemStatus: item.item_status,
                supplier: {
                    id: item.supplier_id,
                    name: item.supplier_name,
                    city: item.supplier_city
                }
            })),

            // Pricing
            pricing: {
                itemsSubtotal: order.items_subtotal,
                discountAmount: order.discount_amount,
                couponDiscount: order.coupon_discount,
                couponCode: order.coupon_code,
                gstAmount: order.gst_amount,
                shippingCharges: order.shipping_charges,
                platformFee: order.platform_fee,
                totalAmount: order.total_amount
            },

            // Shipping
            shippingAddress: order.shipping_address,
            billingAddress: order.billing_address,
            deliveryEta: order.delivery_eta,
            shippingPartner: order.shipping_partner,
            trackingNumber: order.tracking_number,

            // Payment
            paymentMethod: order.payment_method,
            paymentTransactionId: order.payment_transaction_id,
            paymentDate: order.payment_date,

            // Documents
            invoiceUrl: order.invoice_url,
            invoiceNumber: order.invoice_number,

            // Tracking
            tracking: order.order_tracking?.map(track => ({
                status: track.status,
                title: track.title,
                description: track.description,
                location: track.location,
                isMilestone: track.is_milestone,
                timestamp: track.created_at
            })) || [],

            // Timestamps
            createdAt: order.created_at,
            updatedAt: order.updated_at,
            completedAt: order.completed_at
        };

        res.json({
            success: true,
            message: 'Order details retrieved successfully',
            data: formattedOrder
        });

    } catch (error) {
        console.error('Error getting order details:', error);
        res.status(500).json({
            success: false,
            errorCode: 'SERVER_ERROR',
            message: 'Failed to retrieve order details'
        });
    }
};

/**
 * GET /api/buyer/orders/:orderId/tracking
 * Get order tracking information
 */
const getOrderTracking = async (req, res) => {
    try {
        const userId = req.user.id;
        const { orderId } = req.params;

        // First verify order belongs to user
        const order = await Order.getOrderWithTracking(orderId, userId);

        if (!order) {
            return res.status(404).json({
                success: false,
                errorCode: 'ORDER_NOT_FOUND',
                message: 'Order not found'
            });
        }

        const trackingData = {
            orderId: order.id,
            orderNumber: order.order_number,
            status: order.status,
            shippingPartner: order.shipping_partner,
            trackingNumber: order.tracking_number,
            deliveryEta: order.delivery_eta,

            trackingUpdates: order.order_tracking?.map(track => ({
                status: track.status,
                title: track.title,
                description: track.description,
                location: track.location,
                isMilestone: track.is_milestone,
                timestamp: track.created_at
            })) || [],

            currentLocation: order.order_tracking?.length > 0
                ? order.order_tracking[order.order_tracking.length - 1].location
                : null
        };

        res.json({
            success: true,
            message: 'Order tracking retrieved successfully',
            data: trackingData
        });

    } catch (error) {
        console.error('Error getting order tracking:', error);
        res.status(500).json({
            success: false,
            errorCode: 'SERVER_ERROR',
            message: 'Failed to retrieve order tracking'
        });
    }
};

/**
 * POST /api/buyer/orders/:orderId/cancel
 * Cancel an order
 */
const cancelOrder = async (req, res) => {
    try {
        const userId = req.user.id;
        const { orderId } = req.params;
        const { reason } = req.body;

        // Get order to check status
        const order = await Order.getOrderWithTracking(orderId, userId);

        if (!order) {
            return res.status(404).json({
                success: false,
                errorCode: 'ORDER_NOT_FOUND',
                message: 'Order not found'
            });
        }

        // Check if order can be cancelled
        if (!['pending', 'confirmed'].includes(order.status)) {
            return res.status(400).json({
                success: false,
                errorCode: 'ORDER_CANNOT_BE_CANCELLED',
                message: 'This order cannot be cancelled. Please contact support.'
            });
        }

        // Cancel the order
        const cancelledOrder = await Order.cancelOrder(orderId, userId, reason);

        // Add tracking update
        await Order.addTracking(orderId, {
            status: 'cancelled',
            title: 'Order Cancelled',
            description: `Order cancelled by buyer. Reason: ${reason}`,
            is_milestone: true
        });

        // Send notification
        await NotificationService.sendOrderCancelled(userId, cancelledOrder);

        res.json({
            success: true,
            message: 'Order cancelled successfully',
            data: {
                orderId: cancelledOrder.id,
                orderNumber: cancelledOrder.order_number,
                status: cancelledOrder.status,
                cancellationReason: cancelledOrder.cancellation_reason,
                cancelledAt: cancelledOrder.cancelled_at
            }
        });

    } catch (error) {
        console.error('Error cancelling order:', error);
        res.status(500).json({
            success: false,
            errorCode: 'SERVER_ERROR',
            message: 'Failed to cancel order'
        });
    }
};

/**
 * GET /api/buyer/orders/stats
 * Get buyer order statistics
 */
const getOrderStats = async (req, res) => {
    try {
        const userId = req.user.id;

        const stats = await Order.getBuyerStats(userId);

        res.json({
            success: true,
            message: 'Order statistics retrieved successfully',
            data: stats
        });

    } catch (error) {
        console.error('Error getting order stats:', error);
        res.status(500).json({
            success: false,
            errorCode: 'SERVER_ERROR',
            message: 'Failed to retrieve order statistics'
        });
    }
};

module.exports = {
    getActiveOrders,
    getOrderHistory,
    getOrderById,
    getOrderTracking,
    cancelOrder,
    getOrderStats
};
