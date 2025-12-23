/**
 * Admin Management Routes
 * Handles admin user management operations
 */

const express = require('express');
const router = express.Router();
const adminManagementController = require('../controllers/adminManagement.controller');
const { verifyToken } = require('../middleware/auth.middleware');
const { requireSuperAdmin } = require('../middleware/role.middleware');

// All admin management routes require authentication and super_admin role
router.use(verifyToken);
router.use(requireSuperAdmin);

/**
 * @route   GET /api/admin/admins
 * @desc    Get all admin users
 * @access  Private (super_admin only)
 */
router.get('/', adminManagementController.getAllAdmins);

/**
 * @route   POST /api/admin/admins
 * @desc    Create a new admin user
 * @access  Private (super_admin only)
 */
router.post('/', adminManagementController.createAdmin);

/**
 * @route   POST /api/admin/admins/:id/reset-password
 * @desc    Reset admin password
 * @access  Private (super_admin only)
 */
router.post('/:id/reset-password', adminManagementController.resetAdminPassword);

/**
 * @route   POST /api/admin/admins/:id/resend-credentials
 * @desc    Resend admin credentials
 * @access  Private (super_admin only)
 */
router.post('/:id/resend-credentials', adminManagementController.resendCredentials);

/**
 * @route   PATCH /api/admin/admins/:id/deactivate
 * @desc    Deactivate admin account
 * @access  Private (super_admin only)
 */
router.patch('/:id/deactivate', adminManagementController.deactivateAdmin);

/**
 * @route   PATCH /api/admin/admins/:id/activate
 * @desc    Activate admin account
 * @access  Private (super_admin only)
 */
router.patch('/:id/activate', adminManagementController.activateAdmin);

/**
 * @route   DELETE /api/admin/admins/:id
 * @desc    Delete admin account (permanent)
 * @access  Private (super_admin only)
 */
router.delete('/:id', adminManagementController.deleteAdmin);

module.exports = router;
