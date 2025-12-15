const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const PasswordResetToken = require('../models/PasswordResetToken');
const { passwordUtils, jwtUtils, otpUtils, tokenUtils, sanitizeUtils } = require('../utils/auth.utils');
const emailService = require('../services/email.service');
const smsService = require('../services/sms.service');
const googleAuthService = require('../services/google.service');
const { redisHelpers } = require('../config/redis');
const { AppError, ERROR_CODES, asyncHandler } = require('../middleware/error.middleware');

/**
 * @route   POST /auth/signup
 * @desc    Register a new user
 * @access  Public
 */
const signup = asyncHandler(async (req, res) => {
    const {
        firstName,
        lastName,
        companyName,
        businessEmail,
        mobile,
        password,
        businessType,
        gstNumber
    } = req.validatedBody;

    // Check if user already exists
    const existingEmail = await User.findByEmail(businessEmail);
    if (existingEmail) {
        throw new AppError(
            'Email already registered',
            400,
            ERROR_CODES.USER_ALREADY_EXISTS
        );
    }

    const existingMobile = await User.findByMobile(mobile);
    if (existingMobile) {
        throw new AppError(
            'Mobile number already registered',
            400,
            ERROR_CODES.USER_ALREADY_EXISTS
        );
    }

    // Hash password
    const passwordHash = await passwordUtils.hash(password);

    // Generate OTP
    const otp = otpUtils.generate(6);
    const otpExpiresAt = otpUtils.getExpiryTime(
        parseInt(process.env.OTP_EXPIRY_MINUTES) || 10
    );

    // Create user
    const user = await User.create({
        first_name: firstName,
        last_name: lastName,
        company_name: companyName,
        business_email: businessEmail,
        mobile: mobile,
        password_hash: passwordHash,
        business_type: businessType,
        gst_number: gstNumber || null,
        role: 'buyer', // Default role
        is_verified: false,
        otp: otp,
        otp_expires_at: otpExpiresAt.toISOString()
    });

    // Store OTP in Redis for faster verification
    await redisHelpers.storeOTP(
        businessEmail,
        otp,
        parseInt(process.env.OTP_EXPIRY_MINUTES) || 10
    );

    // Send OTP via email only
    try {
        await emailService.sendOTP(businessEmail, otp, firstName);
    } catch (error) {
        console.error('Failed to send OTP:', error);
        // Don't fail the request if OTP send fails
    }

    res.status(201).json({
        success: true,
        message: 'Registration successful. Please verify your email with the OTP sent.',
        data: {
            userId: user.id,
            email: user.business_email,
            mobile: user.mobile,
            otpSent: true
        }
    });
});

/**
 * @route   POST /auth/verify-otp
 * @desc    Verify OTP and complete registration
 * @access  Public
 */
const verifyOTP = asyncHandler(async (req, res) => {
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

    if (user.is_verified) {
        throw new AppError(
            'User already verified',
            400,
            'USER_ALREADY_VERIFIED'
        );
    }

    // Verify OTP from Redis first (faster)
    const isValidRedisOTP = await redisHelpers.verifyOTP(user.business_email, otp);

    // If Redis verification fails, check database
    if (!isValidRedisOTP) {
        if (user.otp !== otp) {
            throw new AppError(
                'Invalid OTP',
                400,
                ERROR_CODES.INVALID_OTP
            );
        }

        // Check if OTP is expired
        if (new Date(user.otp_expires_at) < new Date()) {
            throw new AppError(
                'OTP has expired',
                400,
                ERROR_CODES.OTP_EXPIRED
            );
        }
    }

    // Mark user as verified
    const verifiedUser = await User.markAsVerified(user.id);
    await User.updateLastLogin(user.id);

    // Generate tokens
    const accessToken = jwtUtils.generateAccessToken(
        verifiedUser.id,
        verifiedUser.business_email,
        verifiedUser.role
    );
    const refreshToken = jwtUtils.generateRefreshToken(verifiedUser.id);

    // Store refresh token
    const refreshTokenExpiry = jwtUtils.getExpiryTime(
        process.env.JWT_REFRESH_EXPIRY || '7d'
    );
    await RefreshToken.create(
        verifiedUser.id,
        refreshToken,
        refreshTokenExpiry.toISOString()
    );

    // Store in Redis for quick verification
    await redisHelpers.storeRefreshToken(
        verifiedUser.id,
        refreshToken,
        7 * 24 * 60 * 60 // 7 days in seconds
    );

    // Send welcome email
    try {
        await emailService.sendWelcome(
            verifiedUser.business_email,
            verifiedUser.first_name,
            verifiedUser.role
        );
    } catch (error) {
        console.error('Failed to send welcome email:', error);
    }

    res.json({
        success: true,
        message: 'Account verified successfully',
        data: {
            user: sanitizeUtils.sanitizeUser(verifiedUser),
            accessToken,
            refreshToken
        }
    });
});

/**
 * @route   POST /auth/resend-otp
 * @desc    Resend OTP
 * @access  Public
 */
const resendOTP = asyncHandler(async (req, res) => {
    const { identifier } = req.validatedBody;

    // Find user
    const user = await User.findByEmailOrMobile(identifier);

    if (!user) {
        throw new AppError(
            'User not found',
            404,
            ERROR_CODES.USER_NOT_FOUND
        );
    }

    if (user.is_verified) {
        throw new AppError(
            'User already verified',
            400,
            'USER_ALREADY_VERIFIED'
        );
    }

    // Generate new OTP
    const otp = otpUtils.generate(6);
    const otpExpiresAt = otpUtils.getExpiryTime(
        parseInt(process.env.OTP_EXPIRY_MINUTES) || 10
    );

    // Update OTP in database
    await User.updateOTP(user.id, otp, otpExpiresAt.toISOString());

    // Store in Redis
    await redisHelpers.storeOTP(
        user.business_email,
        otp,
        parseInt(process.env.OTP_EXPIRY_MINUTES) || 10
    );

    // Send OTP via email only
    try {
        await emailService.sendOTP(user.business_email, otp, user.first_name);
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
        message: 'OTP resent successfully',
        data: {
            otpSent: true
        }
    });
});

module.exports = {
    signup,
    verifyOTP,
    resendOTP
};
