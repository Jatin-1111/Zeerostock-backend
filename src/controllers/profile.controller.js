const User = require('../models/User');
const UserRole = require('../models/UserRole');
const emailService = require('../services/email.service');
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

    // Get all active roles for the user
    const activeRoles = await UserRole.findActiveRoles(req.userId);

    // Add role information from JWT token
    user.active_role = req.role; // From JWT token
    user.roles = activeRoles;

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

    // Send profile updated email (non-blocking)
    try {
        const user = await User.findById(req.userId);
        if (user && user.business_email) {
            const updatedFieldsList = [];
            if (firstName) updatedFieldsList.push('First Name');
            if (lastName) updatedFieldsList.push('Last Name');
            if (companyName) updatedFieldsList.push('Company Name');
            if (mobile) updatedFieldsList.push('Mobile Number');
            if (businessType) updatedFieldsList.push('Business Type');

            await emailService.sendProfileUpdated(user.business_email || user.email, {
                userName: `${user.first_name} ${user.last_name}`,
                updatedFields: updatedFieldsList.length > 0 ? updatedFieldsList.join(', ') : 'Your profile information'
            });
        }
    } catch (emailError) {
        console.error('Error sending profile updated email:', emailError);
        // Don't fail the request if email fails
    }

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

    // Get current user first to send email with old role
    const currentUser = await User.findById(req.userId);
    const previousRole = currentUser.role || 'Guest';

    // Update role
    const updatedUser = await User.updateRole(req.userId, role);

    // Send role switched email (non-blocking)
    try {
        if (currentUser && currentUser.business_email && previousRole !== role) {
            await emailService.sendRoleSwitched(currentUser.business_email || currentUser.email, {
                userName: `${currentUser.first_name} ${currentUser.last_name}`,
                newRole: role.charAt(0).toUpperCase() + role.slice(1),
                previousRole: previousRole.charAt(0).toUpperCase() + previousRole.slice(1)
            });
        }
    } catch (emailError) {
        console.error('Error sending role switched email:', emailError);
        // Don't fail the request if email fails
    }

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
    const user = await User.findById(req.userId);

    // Deactivate user (soft delete)
    await User.update(req.userId, { is_active: false });

    // Send account deactivation email (non-blocking)
    try {
        if (user && user.business_email) {
            await emailService.sendAccountDeactivated(user.business_email || user.email, {
                userName: `${user.first_name} ${user.last_name}`,
                reactivationLink: `${process.env.FRONTEND_URL}/auth/reactivate`
            });
        }
    } catch (emailError) {
        console.error('Error sending account deactivation email:', emailError);
        // Don't fail the request if email fails
    }

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
