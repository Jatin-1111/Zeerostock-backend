/**
 * User Management Routes
 * Handles admin operations for managing platform users
 * Base path: /api/users
 */

const express = require('express');
const router = express.Router();
const userManagementController = require('../controllers/userManagement.controller');
const { verifyToken } = require('../middleware/auth.middleware');
const { requireAdminOrSuperAdmin } = require('../middleware/role.middleware');

// All user management routes require authentication and admin role
router.use(verifyToken);
router.use(requireAdminOrSuperAdmin);

/**
 * @route   GET /api/users
 * @desc    Get all users with filtering and pagination
 * @access  Private (admin only)
 */
router.get('/', userManagementController.getAllUsers);

/**
 * @route   GET /api/users/stats
 * @desc    Get user statistics
 * @access  Private (admin only)
 */
router.get('/stats', userManagementController.getUserStats);

/**
 * @route   GET /api/users/stats/by-location
 * @desc    Get user statistics grouped by location
 * @access  Private (admin only)
 */
router.get('/stats/by-location', userManagementController.getUsersByLocation);

/**
 * @route   GET /api/users/:id
 * @desc    Get user details
 * @access  Private (admin only)
 */
router.get('/:id', userManagementController.getUserDetails);

/**
 * @route   PATCH /api/users/:id/activate
 * @desc    Activate a user
 * @access  Private (admin only)
 */
router.patch('/:id/activate', userManagementController.activateUser);

/**
 * @route   PATCH /api/users/:id/deactivate
 * @desc    Deactivate a user
 * @access  Private (admin only)
 */
router.patch('/:id/deactivate', userManagementController.deactivateUser);

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete a user
 * @access  Private (admin only)
 */
router.delete('/:id', userManagementController.deleteUser);

module.exports = router;
