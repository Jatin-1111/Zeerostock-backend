const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth.middleware');
const {
    getPendingVerifications,
    getVerificationDetails,
    approveVerification,
    rejectVerification,
    markUnderReview,
    getVerificationStats,
    getAllVerifications,
    getOrderStats,
    getAllOrders,
    getOrderDetails,
    updateOrderStatus,
    getVerificationDocument,
    getRFQStats,
    getAllRFQs,
    getRFQDetails
} = require('../controllers/admin.controller');

// Middleware to check admin role
const requireAdmin = (req, res, next) => {
    // Check if user has admin privileges in any of the available role properties
    const userRoles = req.user?.roles || [];
    const hasAdminRole =
        userRoles.includes('admin') ||
        userRoles.includes('super_admin') ||
        req.role === 'admin' ||
        req.role === 'super_admin' ||
        req.user?.active_role === 'admin' ||
        req.user?.active_role === 'super_admin';

    if (!req.user || !hasAdminRole) {

        return res.status(403).json({
            success: false,
            message: 'Access denied. Admin privileges required.',
            errorCode: 'FORBIDDEN'
        });
    }
    next();
};

// All admin routes require authentication and admin role
router.use(verifyToken);
router.use(requireAdmin);

/**
 * @swagger
 * /admin/supplier-verifications/stats:
 *   get:
 *     summary: Get supplier verification statistics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 */
router.get('/supplier-verifications/stats', getVerificationStats);

/**
 * @swagger
 * /admin/supplier-verifications/all:
 *   get:
 *     summary: Get all verifications with filter
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 */
router.get('/supplier-verifications/all', getAllVerifications);

/**
 * @swagger
 * /admin/supplier-verifications:
 *   get:
 *     summary: Get pending supplier verifications
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 */
router.get('/supplier-verifications', getPendingVerifications);

/**
 * @swagger
 * /admin/supplier-verifications/:id:
 *   get:
 *     summary: Get single verification details
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 */
router.get('/supplier-verifications/:id', getVerificationDetails);

/**
 * @swagger
 * /admin/supplier-verifications/:id/approve:
 *   post:
 *     summary: Approve supplier verification
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 */
router.post('/supplier-verifications/:id/approve', approveVerification);

/**
 * @swagger
 * /admin/supplier-verifications/:id/reject:
 *   post:
 *     summary: Reject supplier verification
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 */
router.post('/supplier-verifications/:id/reject', rejectVerification);

/**
 * @swagger
 * /admin/supplier-verifications/:id/review:
 *   post:
 *     summary: Mark verification as under review
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 */
router.post('/supplier-verifications/:id/review', markUnderReview);

/**
 * @swagger
 * /admin/verification-document:
 *   get:
 *     summary: Get verification document (proxy to Cloudinary)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 */
router.get('/verification-document', getVerificationDocument);

/**
 * ORDER MANAGEMENT ROUTES
 */

/**
 * @route   GET /api/admin/orders/stats
 * @desc    Get order statistics for admin dashboard
 * @access  Private (Admin only)
 */
router.get('/orders/stats', getOrderStats);

/**
 * @route   GET /api/admin/orders
 * @desc    Get all orders with filters
 * @access  Private (Admin only)
 */
router.get('/orders', getAllOrders);

/**
 * @route   GET /api/admin/orders/:orderId
 * @desc    Get specific order details
 * @access  Private (Admin only)
 */
router.get('/orders/:orderId', getOrderDetails);

/**
 * @route   PUT /api/admin/orders/:orderId/status
 * @desc    Update order status
 * @access  Private (Admin only)
 */
router.put('/orders/:orderId/status', updateOrderStatus);

/**
 * RFQ MANAGEMENT ROUTES - For market demand analysis
 */

/**
 * @route   GET /api/admin/rfqs/stats
 * @desc    Get RFQ statistics by industry/category
 * @access  Private (Admin only)
 */
router.get('/rfqs/stats', getRFQStats);

/**
 * @route   GET /api/admin/rfqs
 * @desc    Get all RFQs with filters
 * @access  Private (Admin only)
 */
router.get('/rfqs', getAllRFQs);

/**
 * @route   GET /api/admin/rfqs/:id
 * @desc    Get RFQ details
 * @access  Private (Admin only)
 */
router.get('/rfqs/:id', getRFQDetails);

module.exports = router;
