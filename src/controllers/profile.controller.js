const User = require('../models/User');
const { sanitizeUtils } = require('../utils/auth.utils');
const { AppError, ERROR_CODES, asyncHandler } = require('../middleware/error.middleware');

/**
 * @route   GET /auth/me
 * @desc    Get current user profile
 * @access  Private
 */
const getProfile = asyncHandler(async (req, res) => {
    const user = await User.findById(req.userId);

    if (!user) {
        throw new AppError(
            'User not found',
            404,
            ERROR_CODES.USER_NOT_FOUND
        );
    }

    res.json({
        success: true,
        message: 'Profile retrieved successfully',
        data: sanitizeUtils.sanitizeUser(user)
    });
});

/**
 * @route   PUT /auth/me
 * @desc    Update user profile
 * @access  Private
 */
const updateProfile = asyncHandler(async (req, res) => {
    const { firstName, lastName, companyName, mobile, businessType } = req.validatedBody;

    // Build update object
    const updateData = {};
    if (firstName) updateData.first_name = firstName;
    if (lastName) updateData.last_name = lastName;
    if (companyName) updateData.company_name = companyName;
    if (businessType) updateData.business_type = businessType;

    // Check if mobile is being changed
    if (mobile) {
        // Check if mobile is already used by another user
        const existingMobile = await User.findByMobile(mobile);
        if (existingMobile && existingMobile.id !== req.userId) {
            throw new AppError(
                'Mobile number already in use',
                400,
                ERROR_CODES.USER_ALREADY_EXISTS
            );
        }
        updateData.mobile = mobile;
    }

    // Update user
    const updatedUser = await User.update(req.userId, updateData);

    res.json({
        success: true,
        message: 'Profile updated successfully',
        data: sanitizeUtils.sanitizeUser(updatedUser)
    });
});

/**
 * @route   PUT /auth/add-gst
 * @desc    Add or update GST number
 * @access  Private
 */
const addGST = asyncHandler(async (req, res) => {
    const { gstNumber } = req.validatedBody;

    // Update GST
    const updatedUser = await User.addGST(req.userId, gstNumber);

    res.json({
        success: true,
        message: 'GST number updated successfully',
        data: sanitizeUtils.sanitizeUser(updatedUser)
    });
});

/**
 * @route   PUT /auth/set-role
 * @desc    Set user role (buyer/supplier)
 * @access  Private
 */
const setRole = asyncHandler(async (req, res) => {
    const { role } = req.validatedBody;

    // Update role
    const updatedUser = await User.updateRole(req.userId, role);

    res.json({
        success: true,
        message: `Role updated to ${role} successfully`,
        data: sanitizeUtils.sanitizeUser(updatedUser)
    });
});

/**
 * @route   DELETE /auth/me
 * @desc    Deactivate user account
 * @access  Private
 */
const deactivateAccount = asyncHandler(async (req, res) => {
    // Deactivate user (soft delete)
    await User.update(req.userId, { is_active: false });

    res.json({
        success: true,
        message: 'Account deactivated successfully'
    });
});

module.exports = {
    getProfile,
    updateProfile,
    addGST,
    setRole,
    deactivateAccount
};
