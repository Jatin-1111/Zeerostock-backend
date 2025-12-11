const User = require('../models/User');
const PasswordResetToken = require('../models/PasswordResetToken');
const { passwordUtils, tokenUtils } = require('../utils/auth.utils');
const emailService = require('../services/email.service');
const { redisHelpers } = require('../config/redis');
const { AppError, ERROR_CODES, asyncHandler } = require('../middleware/error.middleware');

/**
 * @route   POST /auth/forgot-password
 * @desc    Send password reset link
 * @access  Public
 */
const forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.validatedBody;

    // Find user by email
    const user = await User.findByEmail(email);

    if (!user) {
        // Don't reveal if email exists or not for security
        return res.json({
            success: true,
            message: 'If the email exists, a password reset link has been sent'
        });
    }

    // Generate reset token
    const resetToken = tokenUtils.generate(32);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Store token in database
    await PasswordResetToken.create(
        user.id,
        resetToken,
        expiresAt.toISOString()
    );

    // Store in Redis for faster verification
    await redisHelpers.storeResetToken(resetToken, user.id, 15);

    // Create reset link
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    // Send email
    try {
        const emailSent = await emailService.sendPasswordReset(
            user.business_email,
            resetLink,
            user.first_name
        );

        if (!emailSent) {
            console.error('Email service returned false');
            throw new AppError(
                'Failed to send password reset email. Please try again later.',
                500,
                ERROR_CODES.EMAIL_SEND_FAILED
            );
        }

        console.log(`Password reset email sent to: ${user.business_email}`);
    } catch (error) {
        console.error('Failed to send reset email:', error);
        throw new AppError(
            'Failed to send password reset email',
            500,
            ERROR_CODES.EMAIL_SEND_FAILED
        );
    }

    res.json({
        success: true,
        message: 'Password reset link has been sent to your email'
    });
});

/**
 * @route   POST /auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 */
const resetPassword = asyncHandler(async (req, res) => {
    const { token, newPassword } = req.validatedBody;

    // Verify token from Redis first
    let userId = await redisHelpers.verifyResetToken(token);

    if (!userId) {
        // Check database
        const tokenRecord = await PasswordResetToken.findValidToken(token);

        if (!tokenRecord) {
            throw new AppError(
                'Invalid or expired reset token',
                400,
                ERROR_CODES.RESET_TOKEN_EXPIRED
            );
        }

        userId = tokenRecord.user_id;

        // Mark token as used
        await PasswordResetToken.markAsUsed(token);
    }

    // Get user
    const user = await User.findById(userId);

    if (!user) {
        throw new AppError(
            'User not found',
            404,
            ERROR_CODES.USER_NOT_FOUND
        );
    }

    // Check if new password is same as old password
    const isSamePassword = await passwordUtils.compare(newPassword, user.password_hash);

    if (isSamePassword) {
        throw new AppError(
            'New password cannot be the same as your previous password',
            400,
            'PASSWORD_REUSE_ERROR'
        );
    }

    // Hash new password
    const newPasswordHash = await passwordUtils.hash(newPassword);

    // Update password
    await User.updatePassword(userId, newPasswordHash);

    // Invalidate all other reset tokens for this user
    await PasswordResetToken.invalidateUserTokens(userId);

    res.json({
        success: true,
        message: 'Password reset successfully. Please login with your new password.'
    });
});

/**
 * @route   POST /auth/change-password
 * @desc    Change password (when logged in)
 * @access  Private
 */
const changePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    // Validate input
    if (!currentPassword || !newPassword) {
        throw new AppError(
            'Current password and new password are required',
            400,
            ERROR_CODES.VALIDATION_ERROR
        );
    }

    // Validate new password format
    if (!passwordUtils.validate(newPassword)) {
        throw new AppError(
            'Password must be at least 8 characters and contain at least one number and one special character',
            400,
            ERROR_CODES.INVALID_PASSWORD_FORMAT
        );
    }

    // Get user
    const user = await User.findById(req.userId);

    // Verify current password
    const isPasswordValid = await passwordUtils.compare(currentPassword, user.password_hash);

    if (!isPasswordValid) {
        throw new AppError(
            'Current password is incorrect',
            401,
            ERROR_CODES.INVALID_CREDENTIALS
        );
    }

    // Check if new password is same as current
    if (currentPassword === newPassword) {
        throw new AppError(
            'New password must be different from current password',
            400,
            'PASSWORD_REUSE_ERROR'
        );
    }

    // Hash new password
    const newPasswordHash = await passwordUtils.hash(newPassword);

    // Update password
    await User.updatePassword(req.userId, newPasswordHash);

    res.json({
        success: true,
        message: 'Password changed successfully'
    });
});

module.exports = {
    forgotPassword,
    resetPassword,
    changePassword
};
