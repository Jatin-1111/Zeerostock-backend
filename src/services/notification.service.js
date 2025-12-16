const Notification = require('../models/Notification');

/**
 * Notification Service
 * Centralized service for creating and managing notifications
 */
class NotificationService {
    /**
     * Send order confirmation notification
     * @param {string} userId
     * @param {Object} order
     */
    static async sendOrderConfirmation(userId, order) {
        return await Notification.create({
            user_id: userId,
            type: 'order_confirmed',
            title: `Order Confirmed - ${order.order_number}`,
            message: `Your order of ₹${order.total_amount} has been confirmed and is being processed.`,
            resource_type: 'order',
            resource_id: order.id,
            action_url: `/buyer/orders/${order.id}`,
            priority: 'high'
        });
    }

    /**
     * Send order shipped notification
     * @param {string} userId
     * @param {Object} order
     */
    static async sendOrderShipped(userId, order) {
        return await Notification.create({
            user_id: userId,
            type: 'order_shipped',
            title: `Order Shipped - ${order.order_number}`,
            message: `Your order has been shipped via ${order.shipping_partner}. Tracking: ${order.tracking_number}`,
            resource_type: 'order',
            resource_id: order.id,
            action_url: `/buyer/orders/${order.id}/tracking`,
            priority: 'high'
        });
    }

    /**
     * Send order delivered notification
     * @param {string} userId
     * @param {Object} order
     */
    static async sendOrderDelivered(userId, order) {
        return await Notification.create({
            user_id: userId,
            type: 'order_delivered',
            title: `Order Delivered - ${order.order_number}`,
            message: `Your order has been delivered successfully. Please rate your experience.`,
            resource_type: 'order',
            resource_id: order.id,
            action_url: `/buyer/orders/${order.id}`,
            priority: 'high'
        });
    }

    /**
     * Send order cancelled notification
     * @param {string} userId
     * @param {Object} order
     */
    static async sendOrderCancelled(userId, order) {
        return await Notification.create({
            user_id: userId,
            type: 'order_cancelled',
            title: `Order Cancelled - ${order.order_number}`,
            message: `Your order has been cancelled. Refund will be processed within 5-7 business days.`,
            resource_type: 'order',
            resource_id: order.id,
            action_url: `/buyer/orders/${order.id}`,
            priority: 'high'
        });
    }

    /**
     * Send payment success notification
     * @param {string} userId
     * @param {Object} order
     */
    static async sendPaymentSuccess(userId, order) {
        return await Notification.create({
            user_id: userId,
            type: 'payment_success',
            title: 'Payment Successful',
            message: `Payment of ₹${order.total_amount} for order ${order.order_number} was successful.`,
            resource_type: 'order',
            resource_id: order.id,
            action_url: `/buyer/orders/${order.id}`,
            priority: 'high'
        });
    }

    /**
     * Send payment failed notification
     * @param {string} userId
     * @param {Object} orderData
     */
    static async sendPaymentFailed(userId, orderData) {
        return await Notification.create({
            user_id: userId,
            type: 'payment_failed',
            title: 'Payment Failed',
            message: `Payment of ₹${orderData.amount} failed. Please try again or use a different payment method.`,
            priority: 'urgent'
        });
    }

    /**
     * Send price drop notification
     * @param {string} userId
     * @param {Object} product
     * @param {number} oldPrice
     * @param {number} newPrice
     */
    static async sendPriceDrop(userId, product, oldPrice, newPrice) {
        const discount = Math.round(((oldPrice - newPrice) / oldPrice) * 100);

        return await Notification.create({
            user_id: userId,
            type: 'price_drop',
            title: `Price Drop: ${product.title}`,
            message: `Price dropped by ${discount}% from ₹${oldPrice} to ₹${newPrice}. Check it out now!`,
            resource_type: 'product',
            resource_id: product.id,
            action_url: `/products/${product.slug || product.id}`,
            priority: 'normal',
            data: {
                oldPrice,
                newPrice,
                discount
            }
        });
    }

    /**
     * Send back in stock notification
     * @param {string} userId
     * @param {Object} product
     */
    static async sendBackInStock(userId, product) {
        return await Notification.create({
            user_id: userId,
            type: 'back_in_stock',
            title: `Back in Stock: ${product.title}`,
            message: `The product you were watching is back in stock. Order now before it's gone!`,
            resource_type: 'product',
            resource_id: product.id,
            action_url: `/products/${product.slug || product.id}`,
            priority: 'normal'
        });
    }

    /**
     * Send auction won notification
     * @param {string} userId
     * @param {Object} auction
     */
    static async sendAuctionWon(userId, auction) {
        return await Notification.create({
            user_id: userId,
            type: 'auction_won',
            title: `Congratulations! You won the auction`,
            message: `You won the auction for ${auction.productTitle} at ₹${auction.winningBid}. Complete payment within 24 hours.`,
            resource_type: 'auction',
            resource_id: auction.id,
            action_url: `/auctions/${auction.id}/payment`,
            priority: 'urgent'
        });
    }

    /**
     * Send auction outbid notification
     * @param {string} userId
     * @param {Object} auction
     * @param {number} currentBid
     */
    static async sendAuctionOutbid(userId, auction, currentBid) {
        return await Notification.create({
            user_id: userId,
            type: 'auction_outbid',
            title: `You've been outbid`,
            message: `You've been outbid on ${auction.productTitle}. Current bid: ₹${currentBid}. Place a higher bid now!`,
            resource_type: 'auction',
            resource_id: auction.id,
            action_url: `/auctions/${auction.id}`,
            priority: 'high'
        });
    }

    /**
     * Send auction ending notification
     * @param {string} userId
     * @param {Object} auction
     * @param {number} hoursLeft
     */
    static async sendAuctionEnding(userId, auction, hoursLeft) {
        return await Notification.create({
            user_id: userId,
            type: 'auction_ending',
            title: `Auction ending soon`,
            message: `The auction for ${auction.productTitle} ends in ${hoursLeft} hours. Don't miss out!`,
            resource_type: 'auction',
            resource_id: auction.id,
            action_url: `/auctions/${auction.id}`,
            priority: 'urgent'
        });
    }

    /**
     * Send review response notification
     * @param {string} userId
     * @param {Object} review
     * @param {string} supplierName
     */
    static async sendReviewResponse(userId, review, supplierName) {
        return await Notification.create({
            user_id: userId,
            type: 'review_response',
            title: 'Supplier responded to your review',
            message: `${supplierName} has responded to your review. Check it out!`,
            resource_type: 'review',
            resource_id: review.id,
            action_url: `/buyer/reviews/${review.id}`,
            priority: 'normal'
        });
    }

    /**
     * Send system notification
     * @param {string} userId
     * @param {string} title
     * @param {string} message
     * @param {string} priority
     */
    static async sendSystemNotification(userId, title, message, priority = 'normal') {
        return await Notification.create({
            user_id: userId,
            type: 'system',
            title,
            message,
            priority
        });
    }

    /**
     * Send promotional notification
     * @param {string} userId
     * @param {string} title
     * @param {string} message
     * @param {string} actionUrl
     */
    static async sendPromotion(userId, title, message, actionUrl = null) {
        return await Notification.create({
            user_id: userId,
            type: 'promotion',
            title,
            message,
            action_url: actionUrl,
            priority: 'low'
        });
    }

    /**
     * Send bulk notifications to multiple users
     * @param {Array} userIds
     * @param {Object} notificationData
     */
    static async sendBulk(userIds, notificationData) {
        const notifications = userIds.map(userId => ({
            user_id: userId,
            ...notificationData
        }));

        return await Notification.createBulk(notifications);
    }

    /**
     * Send account notification
     * @param {string} userId
     * @param {string} title
     * @param {string} message
     */
    static async sendAccountNotification(userId, title, message) {
        return await Notification.create({
            user_id: userId,
            type: 'account',
            title,
            message,
            priority: 'high'
        });
    }
}

module.exports = NotificationService;
