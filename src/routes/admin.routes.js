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
    getAllVerifications
} = require('../controllers/admin.controller');

// Middleware to check admin role
const requireAdmin = (req, res, next) => {
    if (!req.user || !req.user.roles || !req.user.roles.includes('admin')) {
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

module.exports = router;
