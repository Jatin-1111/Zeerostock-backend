const express = require('express');
const router = express.Router();

// Controllers
const orderController = require('../controllers/order.controller');
const watchlistController = require('../controllers/watchlist.controller');
const recentlyViewedController = require('../controllers/recentlyViewed.controller');
const reviewController = require('../controllers/review.controller');
const buyerProfileController = require('../controllers/buyerProfile.controller');
const notificationController = require('../controllers/notification.controller');
const supportController = require('../controllers/support.controller');

// Middleware
const { verifyToken, verifyUserVerified } = require('../middleware/auth.middleware');
const { validate, buyerValidation } = require('../validators/buyer.validator');

// Apply authentication middleware to all buyer routes
router.use(verifyToken);
router.use(verifyUserVerified);

// =====================================================
// ORDER ROUTES
// =====================================================

/**
 * @route   GET /api/buyer/orders/active
 * @desc    Get buyer's active orders
 * @access  Private (Buyer)
 */
router.get(
    '/orders/active',
    validate(buyerValidation.getOrdersQuery, 'query'),
    orderController.getActiveOrders
);

/**
 * @route   GET /api/buyer/orders/history
 * @desc    Get buyer's order history
 * @access  Private (Buyer)
 */
router.get(
    '/orders/history',
    validate(buyerValidation.getOrdersQuery, 'query'),
    orderController.getOrderHistory
);

/**
 * @route   GET /api/buyer/orders/stats
 * @desc    Get buyer's order statistics
 * @access  Private (Buyer)
 */
router.get(
    '/orders/stats',
    orderController.getOrderStats
);

/**
 * @route   GET /api/buyer/savings
 * @desc    Get buyer's cost savings analytics
 * @access  Private (Buyer)
 */
router.get(
    '/savings',
    orderController.getCostSavings
);

/**
 * @route   GET /api/buyer/orders/export
 * @desc    Export orders to Excel/CSV
 * @access  Private (Buyer)
 */
router.get(
    '/orders/export',
    orderController.exportOrders
);

/**
 * @route   GET /api/buyer/orders/:orderId
 * @desc    Get specific order details
 * @access  Private (Buyer)
 */
router.get(
    '/orders/:orderId',
    validate(buyerValidation.orderIdParam, 'params'),
    orderController.getOrderById
);

/**
 * @route   POST /api/buyer/orders/create
 * @desc    Create a new order from checkout session
 * @access  Private (Buyer)
 */
router.post(
    '/orders/create',
    validate(buyerValidation.createOrder),
    orderController.createOrder
);

/**
 * @route   GET /api/buyer/orders/:orderId/tracking
 * @desc    Get order tracking information
 * @access  Private (Buyer)
 */
router.get(
    '/orders/:orderId/tracking',
    validate(buyerValidation.orderIdParam, 'params'),
    orderController.getOrderTracking
);

/**
 * @route   GET /api/buyer/orders/:orderId/invoice
 * @desc    Download PDF invoice for an order
 * @access  Private (Buyer)
 */
router.get(
    '/orders/:orderId/invoice',
    validate(buyerValidation.orderIdParam, 'params'),
    orderController.downloadInvoice
);

/**
 * @route   POST /api/buyer/orders/:orderId/cancel
 * @desc    Cancel an order
 * @access  Private (Buyer)
 */
router.post(
    '/orders/:orderId/cancel',
    validate(buyerValidation.orderIdParam, 'params'),
    validate(buyerValidation.cancelOrder),
    orderController.cancelOrder
);

// =====================================================
// WATCHLIST ROUTES
// =====================================================

/**
 * @route   GET /api/buyer/watchlist
 * @desc    Get buyer's watchlist
 * @access  Private (Buyer)
 */
router.get(
    '/watchlist',
    validate(buyerValidation.watchlistQuery, 'query'),
    watchlistController.getWatchlist
);

/**
 * @route   POST /api/buyer/watchlist/add
 * @desc    Add product to watchlist
 * @access  Private (Buyer)
 */
router.post(
    '/watchlist/add',
    validate(buyerValidation.addToWatchlist),
    watchlistController.addToWatchlist
);

/**
 * @route   DELETE /api/buyer/watchlist/remove/:productId
 * @desc    Remove product from watchlist
 * @access  Private (Buyer)
 */
router.delete(
    '/watchlist/remove/:productId',
    validate(buyerValidation.removeFromWatchlist, 'params'),
    watchlistController.removeFromWatchlist
);

/**
 * @route   GET /api/buyer/watchlist/count
 * @desc    Get watchlist count
 * @access  Private (Buyer)
 */
router.get(
    '/watchlist/count',
    watchlistController.getWatchlistCount
);

/**
 * @route   DELETE /api/buyer/watchlist/clear-unavailable
 * @desc    Clear unavailable products from watchlist
 * @access  Private (Buyer)
 */
router.delete(
    '/watchlist/clear-unavailable',
    watchlistController.clearUnavailableItems
);

// =====================================================
// RECENTLY VIEWED ROUTES
// =====================================================

/**
 * @route   GET /api/buyer/recently-viewed
 * @desc    Get recently viewed products
 * @access  Private (Buyer)
 */
router.get(
    '/recently-viewed',
    validate(buyerValidation.recentlyViewedQuery, 'query'),
    recentlyViewedController.getRecentlyViewed
);

/**
 * @route   POST /api/buyer/recently-viewed/add
 * @desc    Add product to recently viewed
 * @access  Private (Buyer)
 */
router.post(
    '/recently-viewed/add',
    validate(buyerValidation.addRecentlyViewed),
    recentlyViewedController.addRecentlyViewed
);

/**
 * @route   DELETE /api/buyer/recently-viewed/clear
 * @desc    Clear all recently viewed products
 * @access  Private (Buyer)
 */
router.delete(
    '/recently-viewed/clear',
    recentlyViewedController.clearRecentlyViewed
);

/**
 * @route   DELETE /api/buyer/recently-viewed/:productId
 * @desc    Remove specific product from recently viewed
 * @access  Private (Buyer)
 */
router.delete(
    '/recently-viewed/:productId',
    recentlyViewedController.removeRecentlyViewed
);

/**
 * @route   GET /api/buyer/recently-viewed/count
 * @desc    Get recently viewed count
 * @access  Private (Buyer)
 */
router.get(
    '/recently-viewed/count',
    recentlyViewedController.getRecentlyViewedCount
);

// =====================================================
// REVIEW ROUTES
// =====================================================

/**
 * @route   POST /api/buyer/reviews
 * @desc    Create a new review
 * @access  Private (Buyer)
 */
router.post(
    '/reviews',
    validate(buyerValidation.createReview),
    reviewController.createReview
);

/**
 * @route   GET /api/buyer/reviews/my-reviews
 * @desc    Get buyer's reviews
 * @access  Private (Buyer)
 */
router.get(
    '/reviews/my-reviews',
    validate(buyerValidation.reviewsQuery, 'query'),
    reviewController.getMyReviews
);

/**
 * @route   GET /api/buyer/reviews/:reviewId
 * @desc    Get specific review details
 * @access  Private (Buyer)
 */
router.get(
    '/reviews/:reviewId',
    validate(buyerValidation.reviewIdParam, 'params'),
    reviewController.getReviewById
);

/**
 * @route   PUT /api/buyer/reviews/:reviewId
 * @desc    Update a review
 * @access  Private (Buyer)
 */
router.put(
    '/reviews/:reviewId',
    validate(buyerValidation.reviewIdParam, 'params'),
    validate(buyerValidation.updateReview),
    reviewController.updateReview
);

/**
 * @route   DELETE /api/buyer/reviews/:reviewId
 * @desc    Delete a review
 * @access  Private (Buyer)
 */
router.delete(
    '/reviews/:reviewId',
    validate(buyerValidation.reviewIdParam, 'params'),
    reviewController.deleteReview
);

/**
 * @route   POST /api/buyer/reviews/:reviewId/helpful
 * @desc    Mark review as helpful/not helpful
 * @access  Private (Buyer)
 */
router.post(
    '/reviews/:reviewId/helpful',
    validate(buyerValidation.reviewIdParam, 'params'),
    validate(buyerValidation.markReviewHelpfulness),
    reviewController.markReviewHelpfulness
);

// =====================================================
// PROFILE & SETTINGS ROUTES
// =====================================================

/**
 * @route   GET /api/buyer/profile
 * @desc    Get buyer profile
 * @access  Private (Buyer)
 */
router.get(
    '/profile',
    buyerProfileController.getBuyerProfile
);

/**
 * @route   PUT /api/buyer/profile
 * @desc    Update buyer profile
 * @access  Private (Buyer)
 */
router.put(
    '/profile',
    validate(buyerValidation.updateProfile),
    buyerProfileController.updateBuyerProfile
);

/**
 * @route   PUT /api/buyer/profile/change-password
 * @desc    Change password
 * @access  Private (Buyer)
 */
router.put(
    '/profile/change-password',
    validate(buyerValidation.changePassword),
    buyerProfileController.changePassword
);

/**
 * @route   GET /api/buyer/profile/addresses
 * @desc    Get all addresses
 * @access  Private (Buyer)
 */
router.get(
    '/profile/addresses',
    buyerProfileController.getAddresses
);

/**
 * @route   POST /api/buyer/profile/address
 * @desc    Add new address
 * @access  Private (Buyer)
 */
router.post(
    '/profile/address',
    validate(buyerValidation.addAddress),
    buyerProfileController.addAddress
);

/**
 * @route   PUT /api/buyer/profile/address/:addressId
 * @desc    Update address
 * @access  Private (Buyer)
 */
router.put(
    '/profile/address/:addressId',
    validate(buyerValidation.addressIdParam, 'params'),
    validate(buyerValidation.updateAddress),
    buyerProfileController.updateAddress
);

/**
 * @route   DELETE /api/buyer/profile/address/:addressId
 * @desc    Delete address
 * @access  Private (Buyer)
 */
router.delete(
    '/profile/address/:addressId',
    validate(buyerValidation.addressIdParam, 'params'),
    buyerProfileController.deleteAddress
);

/**
 * @route   PUT /api/buyer/profile/address/:addressId/set-default
 * @desc    Set address as default
 * @access  Private (Buyer)
 */
router.put(
    '/profile/address/:addressId/set-default',
    validate(buyerValidation.addressIdParam, 'params'),
    buyerProfileController.setDefaultAddress
);

// =====================================================
// NOTIFICATION ROUTES
// =====================================================

/**
 * @route   GET /api/buyer/notifications
 * @desc    Get user notifications
 * @access  Private (Buyer)
 */
router.get(
    '/notifications',
    validate(buyerValidation.notificationsQuery, 'query'),
    notificationController.getNotifications
);

/**
 * @route   PUT /api/buyer/notifications/mark-read
 * @desc    Mark notifications as read (bulk)
 * @access  Private (Buyer)
 */
router.put(
    '/notifications/mark-read',
    validate(buyerValidation.markNotificationsRead),
    notificationController.markNotificationsAsRead
);

/**
 * @route   PUT /api/buyer/notifications/:notificationId/read
 * @desc    Mark single notification as read
 * @access  Private (Buyer)
 */
router.put(
    '/notifications/:notificationId/read',
    validate(buyerValidation.notificationIdParam, 'params'),
    notificationController.markNotificationAsRead
);

/**
 * @route   DELETE /api/buyer/notifications/:notificationId
 * @desc    Delete a notification
 * @access  Private (Buyer)
 */
router.delete(
    '/notifications/:notificationId',
    validate(buyerValidation.notificationIdParam, 'params'),
    notificationController.deleteNotification
);

/**
 * @route   GET /api/buyer/notifications/unread-count
 * @desc    Get unread notifications count
 * @access  Private (Buyer)
 */
router.get(
    '/notifications/unread-count',
    notificationController.getUnreadCount
);

/**
 * @route   DELETE /api/buyer/notifications/clear-old
 * @desc    Clear old read notifications
 * @access  Private (Buyer)
 */
router.delete(
    '/notifications/clear-old',
    notificationController.clearOldNotifications
);

// =====================================================
// SUPPORT TICKET ROUTES
// =====================================================

/**
 * @route   POST /api/buyer/support/ticket
 * @desc    Create a new support ticket
 * @access  Private (Buyer)
 */
router.post(
    '/support/ticket',
    validate(buyerValidation.createTicket),
    supportController.createTicket
);

/**
 * @route   GET /api/buyer/support/tickets
 * @desc    Get user's support tickets
 * @access  Private (Buyer)
 */
router.get(
    '/support/tickets',
    validate(buyerValidation.ticketsQuery, 'query'),
    supportController.getTickets
);

/**
 * @route   GET /api/buyer/support/tickets/:ticketId
 * @desc    Get specific ticket details with messages
 * @access  Private (Buyer)
 */
router.get(
    '/support/tickets/:ticketId',
    validate(buyerValidation.ticketIdParam, 'params'),
    supportController.getTicketById
);

/**
 * @route   POST /api/buyer/support/tickets/:ticketId/message
 * @desc    Add message to ticket
 * @access  Private (Buyer)
 */
router.post(
    '/support/tickets/:ticketId/message',
    validate(buyerValidation.ticketIdParam, 'params'),
    validate(buyerValidation.addTicketMessage),
    supportController.addTicketMessage
);

/**
 * @route   PUT /api/buyer/support/tickets/:ticketId/close
 * @desc    Close a ticket
 * @access  Private (Buyer)
 */
router.put(
    '/support/tickets/:ticketId/close',
    validate(buyerValidation.ticketIdParam, 'params'),
    supportController.closeTicket
);

/**
 * @route   PUT /api/buyer/support/tickets/:ticketId/reopen
 * @desc    Reopen a closed ticket
 * @access  Private (Buyer)
 */
router.put(
    '/support/tickets/:ticketId/reopen',
    validate(buyerValidation.ticketIdParam, 'params'),
    supportController.reopenTicket
);

/**
 * @route   POST /api/buyer/support/tickets/:ticketId/rate
 * @desc    Rate ticket resolution
 * @access  Private (Buyer)
 */
router.post(
    '/support/tickets/:ticketId/rate',
    validate(buyerValidation.ticketIdParam, 'params'),
    validate(buyerValidation.rateTicket),
    supportController.rateTicket
);

// =====================================================
// PAYMENT & INVOICE ROUTES
// =====================================================

/**
 * @route   GET /api/buyer/payments
 * @desc    Get buyer's payment transactions
 * @access  Private (Buyer)
 */
router.get(
    '/payments',
    orderController.getPayments
);

/**
 * @route   GET /api/buyer/invoices
 * @desc    Get buyer's invoices
 * @access  Private (Buyer)
 */
router.get(
    '/invoices',
    orderController.getInvoices
);

module.exports = router;
