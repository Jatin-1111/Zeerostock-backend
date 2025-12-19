const express = require('express');
const router = express.Router();
const {
    getSettings,
    updateSettings,
    updateNotifications,
    updatePrivacy,
    updateAccount,
    updateLanguage
} = require('../controllers/settings.controller');
const { verifyToken } = require('../middleware/auth.middleware');
const { requireBuyer } = require('../middleware/role.middleware');
const {
    validateSettingsUpdate,
    validateNotifications,
    validatePrivacy,
    validateAccount,
    validateLanguage
} = require('../validators/settings.validator');

// All routes require authentication and buyer role
router.use(verifyToken, requireBuyer);

// @route   GET /api/buyer/settings
// @desc    Get all user settings
// @access  Private (Buyer)
router.get('/', getSettings);

// @route   PUT /api/buyer/settings
// @desc    Update settings (generic - requires section parameter)
// @access  Private (Buyer)
router.put('/', validateSettingsUpdate, updateSettings);

// @route   PUT /api/buyer/settings/notifications
// @desc    Update notification preferences
// @access  Private (Buyer)
router.put('/notifications', validateNotifications, updateNotifications);

// @route   PUT /api/buyer/settings/privacy
// @desc    Update privacy settings
// @access  Private (Buyer)
router.put('/privacy', validatePrivacy, updatePrivacy);

// @route   PUT /api/buyer/settings/account
// @desc    Update account information
// @access  Private (Buyer)
router.put('/account', validateAccount, updateAccount);

// @route   PUT /api/buyer/settings/language
// @desc    Update language and regional preferences
// @access  Private (Buyer)
router.put('/language', validateLanguage, updateLanguage);

module.exports = router;
