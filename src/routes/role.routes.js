const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth.middleware');
const { validate, authValidation } = require('../validators/auth.validator');
const {
    switchRole,
    requestSupplierRole,
    getUserRoles,
    getSupplierVerificationStatus,
    updateBuyerProfile,
    updateSupplierProfile
} = require('../controllers/role.controller');

/**
 * @swagger
 * /auth/roles:
 *   get:
 *     summary: Get user roles and profiles
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 */
router.get('/roles', verifyToken, getUserRoles);

/**
 * @swagger
 * /auth/supplier-verification-status:
 *   get:
 *     summary: Get supplier verification status
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 */
router.get('/supplier-verification-status', verifyToken, getSupplierVerificationStatus);

/**
 * @swagger
 * /auth/switch-role:
 *   post:
 *     summary: Switch between buyer and supplier roles
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 */
router.post('/switch-role', verifyToken, switchRole);

/**
 * @swagger
 * /auth/request-supplier-role:
 *   post:
 *     summary: Submit supplier verification request
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 */
router.post('/request-supplier-role', verifyToken, requestSupplierRole);

/**
 * @swagger
 * /auth/buyer-profile:
 *   put:
 *     summary: Update buyer profile
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 */
router.put('/buyer-profile', verifyToken, updateBuyerProfile);

/**
 * @swagger
 * /auth/supplier-profile:
 *   put:
 *     summary: Update supplier profile
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 */
router.put('/supplier-profile', verifyToken, updateSupplierProfile);

module.exports = router;
