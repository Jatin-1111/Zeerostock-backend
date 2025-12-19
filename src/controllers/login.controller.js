const User = require('../models/User');
const UserRole = require('../models/UserRole');
const RefreshToken = require('../models/RefreshToken');
const { passwordUtils, jwtUtils, otpUtils, sanitizeUtils } = require('../utils/auth.utils');
const smsService = require('../services/sms.service');
const { redisHelpers } = require('../config/redis');
const { AppError, ERROR_CODES, asyncHandler } = require('../middleware/error.middleware');

/**
 * @route   POST /auth/login
 * @desc    Login user with email/phone and password (Multi-role support)
 * @access  Public
 */
const login = asyncHandler(async (req, res) => {
    const { identifier, password, requestedRole } = req.validatedBody;

    // Find user by email or mobile
    const user = await User.findByEmailOrMobile(identifier);

    if (!user) {
        throw new AppError(
            'Invalid credentials',
            401,
            ERROR_CODES.INVALID_CREDENTIALS
        );
    }

    // Check if user is verified
    if (!user.is_verified) {
        throw new AppError(
            'Please verify your account first',
            403,
            ERROR_CODES.USER_NOT_VERIFIED
        );
    }

    // Check if user is active
    if (!user.is_active) {
        throw new AppError(
            'Your account has been deactivated',
            403,
            ERROR_CODES.USER_INACTIVE
        );
    }

    // Verify password
    const isPasswordValid = await passwordUtils.compare(password, user.password_hash);

    if (!isPasswordValid) {
        throw new AppError(
            'Invalid credentials',
            401,
            ERROR_CODES.INVALID_CREDENTIALS
        );
    }

    // Get all ACTIVE roles for this user
    const activeRoles = await UserRole.findActiveRoles(user.id);

    if (activeRoles.length === 0) {
        throw new AppError(
            'No active roles found for your account',
            403,
            ERROR_CODES.USER_INACTIVE
        );
    }

    // Determine which role to use
    let selectedRole;

    if (requestedRole && activeRoles.includes(requestedRole)) {
        // User requested specific role and has access
        selectedRole = requestedRole;
    } else if (activeRoles.length === 1) {
        // User has only one role
        selectedRole = activeRoles[0];
    } else if (activeRoles.length > 1 && !requestedRole) {
        // User has multiple roles but didn't specify which one
        // Return available roles for frontend to show role selector
        return res.json({
            success: true,
            requiresRoleSelection: true,
            availableRoles: activeRoles,
            user: {
                id: user.id,
                email: user.business_email,
                firstName: user.first_name,
                lastName: user.last_name
            }
        });
    } else {
        throw new AppError(
            'Invalid role selected',
            403,
            ERROR_CODES.INVALID_ROLE
        );
    }

    // Update last login
    await User.updateLastLogin(user.id);

    // Generate tokens with role in payload
    const accessToken = jwtUtils.generateAccessToken(user.id, user.business_email, selectedRole);
    const refreshToken = jwtUtils.generateRefreshToken(user.id);

    // Store refresh token
    const refreshTokenExpiry = jwtUtils.getExpiryTime(process.env.JWT_REFRESH_EXPIRY || '7d');
    await RefreshToken.create(user.id, refreshToken, refreshTokenExpiry.toISOString());
    await redisHelpers.storeRefreshToken(user.id, refreshToken, 7 * 24 * 60 * 60);

    res.json({
        success: true,
        message: 'Login successful',
        data: {
            user: {
                ...sanitizeUtils.sanitizeUser(user),
                activeRole: selectedRole, // Override activeRole with the selected role
                roles: activeRoles // Include all available roles
            },
            accessToken,
            refreshToken
        }
    });
});

/**
 * @route   POST /auth/otp-login
 * @desc    Send OTP for mobile login
 * @access  Public
 */
const sendLoginOTP = asyncHandler(async (req, res) => {
    const { mobile } = req.validatedBody;

    // Find user by mobile
    const user = await User.findByMobile(mobile);

    if (!user) {
        throw new AppError(
            'Mobile number not registered',
            404,
            ERROR_CODES.USER_NOT_FOUND
        );
    }

    if (!user.is_verified) {
        throw new AppError(
            'Please verify your account first',
            403,
            ERROR_CODES.USER_NOT_VERIFIED
        );
    }

    if (!user.is_active) {
        throw new AppError(
            'Your account has been deactivated',
            403,
            ERROR_CODES.USER_INACTIVE
        );
    }

    // Generate OTP
    const otp = otpUtils.generate(6);
    const otpExpiresAt = otpUtils.getExpiryTime(parseInt(process.env.OTP_EXPIRY_MINUTES) || 10);

    // Update OTP in database
    await User.updateOTP(user.id, otp, otpExpiresAt.toISOString());

    // Store in Redis
    await redisHelpers.storeOTP(
        mobile,
        otp,
        parseInt(process.env.OTP_EXPIRY_MINUTES) || 10
    );

    // Send OTP via SMS
    try {
        await smsService.sendLoginOTP(mobile, otp);
    } catch (error) {
        console.error('Failed to send OTP:', error);
        throw new AppError(
            'Failed to send OTP',
            500,
            ERROR_CODES.OTP_SEND_FAILED
        );
    }

    res.json({
        success: true,
        message: 'OTP sent successfully',
        data: {
            mobile: mobile,
            otpSent: true
        }
    });
});

/**
 * @route   POST /auth/verify-login-otp
 * @desc    Verify OTP and login
 * @access  Public
 */
const verifyLoginOTP = asyncHandler(async (req, res) => {
    const { identifier, otp } = req.validatedBody;

    // Find user by email or mobile
    const user = await User.findByEmailOrMobile(identifier);

    if (!user) {
        throw new AppError(
            'User not found',
            404,
            ERROR_CODES.USER_NOT_FOUND
        );
    }

    // Verify OTP from Redis first
    const isValidRedisOTP = await redisHelpers.verifyOTP(identifier, otp);

    if (!isValidRedisOTP) {
        // Check database
        if (user.otp !== otp) {
            throw new AppError(
                'Invalid OTP',
                400,
                ERROR_CODES.INVALID_OTP
            );
        }

        if (new Date(user.otp_expires_at) < new Date()) {
            throw new AppError(
                'OTP has expired',
                400,
                ERROR_CODES.OTP_EXPIRED
            );
        }
    }

    // Clear OTP
    await User.updateOTP(user.id, null, null);

    // Update last login
    await User.updateLastLogin(user.id);

    // Generate tokens
    const accessToken = jwtUtils.generateAccessToken(user.id, user.business_email, user.role);
    const refreshToken = jwtUtils.generateRefreshToken(user.id);

    // Store refresh token
    const refreshTokenExpiry = jwtUtils.getExpiryTime(process.env.JWT_REFRESH_EXPIRY || '7d');
    await RefreshToken.create(user.id, refreshToken, refreshTokenExpiry.toISOString());
    await redisHelpers.storeRefreshToken(user.id, refreshToken, 7 * 24 * 60 * 60);

    res.json({
        success: true,
        message: 'Login successful',
        data: {
            user: sanitizeUtils.sanitizeUser(user),
            accessToken,
            refreshToken
        }
    });
});

/**
 * @route   POST /auth/refresh-token
 * @desc    Refresh access token
 * @access  Public
 */
const refreshAccessToken = asyncHandler(async (req, res) => {
    const { refreshToken } = req.validatedBody;

    // Verify refresh token
    const decoded = jwtUtils.verifyRefreshToken(refreshToken);

    if (!decoded) {
        throw new AppError(
            'Invalid or expired refresh token',
            401,
            ERROR_CODES.REFRESH_TOKEN_EXPIRED
        );
    }

    // Check if token exists in database
    const tokenRecord = await RefreshToken.findByToken(refreshToken);

    if (!tokenRecord) {
        throw new AppError(
            'Refresh token not found or expired',
            401,
            ERROR_CODES.REFRESH_TOKEN_EXPIRED
        );
    }

    // Get user
    const user = await User.findById(decoded.userId);

    if (!user || !user.is_active) {
        throw new AppError(
            'User not found or inactive',
            401,
            ERROR_CODES.USER_NOT_FOUND
        );
    }

    // Generate new access token
    const accessToken = jwtUtils.generateAccessToken(user.id, user.business_email, user.role);

    res.json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
            accessToken
        }
    });
});

/**
 * @route   POST /auth/switch-role
 * @desc    Switch between buyer and supplier roles
 * @access  Private
 */
const switchRole = asyncHandler(async (req, res) => {
    const { newRole, password } = req.body;
    const userId = req.user.id;

    if (!newRole) {
        throw new AppError('New role is required', 400);
    }

    if (!['buyer', 'supplier'].includes(newRole)) {
        throw new AppError('Invalid role. Must be buyer or supplier', 400);
    }

    // Get user
    const user = await User.findById(userId);
    if (!user) {
        throw new AppError('User not found', 404, ERROR_CODES.USER_NOT_FOUND);
    }

    // Edge Case: Require password confirmation for security
    // Especially important for first-time role switch
    if (password) {
        const isPasswordValid = await passwordUtils.compare(password, user.password_hash);
        if (!isPasswordValid) {
            throw new AppError(
                'Invalid password',
                401,
                ERROR_CODES.INVALID_CREDENTIALS
            );
        }
    }

    // Check if user has the requested role and it's active
    const hasRole = await UserRole.hasActiveRole(userId, newRole);
    if (!hasRole) {
        throw new AppError(
            `You don't have access to ${newRole} role or it's not active yet`,
            403,
            ERROR_CODES.INVALID_ROLE
        );
    }

    // Generate new token with new role
    const accessToken = jwtUtils.generateAccessToken(user.id, user.business_email, newRole);
    const refreshToken = jwtUtils.generateRefreshToken(user.id);

    // Store refresh token
    const refreshTokenExpiry = jwtUtils.getExpiryTime(process.env.JWT_REFRESH_EXPIRY || '7d');
    await RefreshToken.create(user.id, refreshToken, refreshTokenExpiry.toISOString());
    await redisHelpers.storeRefreshToken(user.id, refreshToken, 7 * 24 * 60 * 60);

    // Get all available roles for response
    const availableRoles = await UserRole.findActiveRoles(userId);

    res.json({
        success: true,
        message: `Switched to ${newRole} role successfully`,
        data: {
            currentRole: newRole,
            availableRoles: availableRoles,
            accessToken,
            refreshToken
        }
    });
});

/**
 * @route   POST /auth/logout
 * @desc    Logout user
 * @access  Private
 */
const logout = asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;

    if (refreshToken) {
        // Revoke refresh token
        try {
            await RefreshToken.revoke(refreshToken);
            await redisHelpers.revokeRefreshToken(req.userId, refreshToken);
        } catch (error) {
            console.error('Error revoking token:', error);
        }
    }

    res.json({
        success: true,
        message: 'Logout successful'
    });
});

/**
 * @route   POST /auth/logout-all
 * @desc    Logout from all devices
 * @access  Private
 */
const logoutAll = asyncHandler(async (req, res) => {
    // Revoke all refresh tokens for user
    await RefreshToken.revokeAllUserTokens(req.userId);

    res.json({
        success: true,
        message: 'Logged out from all devices successfully'
    });
});

module.exports = {
    login,
    sendLoginOTP,
    verifyLoginOTP,
    refreshAccessToken,
    switchRole,
    logout,
    logoutAll
};
