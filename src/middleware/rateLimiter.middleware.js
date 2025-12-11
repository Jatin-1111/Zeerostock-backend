const rateLimit = require('express-rate-limit');
const { ERROR_CODES } = require('./error.middleware');

/**
 * General rate limiter
 */
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per windowMs
    message: {
        success: false,
        message: 'Too many requests, please try again later',
        errorCode: ERROR_CODES.TOO_MANY_REQUESTS
    },
    standardHeaders: true,
    legacyHeaders: false
});

/**
 * Auth rate limiter (stricter)
 */
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 requests per windowMs
    message: {
        success: false,
        message: 'Too many authentication attempts, please try again after 15 minutes',
        errorCode: ERROR_CODES.RATE_LIMIT_EXCEEDED
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true // Don't count successful requests
});

/**
 * Signup rate limiter
 */
const signupLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 signups per hour per IP
    message: {
        success: false,
        message: 'Too many signup attempts, please try again after an hour',
        errorCode: ERROR_CODES.RATE_LIMIT_EXCEEDED
    },
    standardHeaders: true,
    legacyHeaders: false
});

/**
 * OTP rate limiter
 */
const otpLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 3, // 3 OTP requests per 5 minutes
    message: {
        success: false,
        message: 'Too many OTP requests, please try again after 5 minutes',
        errorCode: ERROR_CODES.RATE_LIMIT_EXCEEDED
    },
    standardHeaders: true,
    legacyHeaders: false
});

/**
 * Password reset rate limiter
 */
const resetPasswordLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 3, // 3 reset requests per 15 minutes
    message: {
        success: false,
        message: 'Too many password reset attempts, please try again after 15 minutes',
        errorCode: ERROR_CODES.RATE_LIMIT_EXCEEDED
    },
    standardHeaders: true,
    legacyHeaders: false
});

module.exports = {
    generalLimiter,
    authLimiter,
    signupLimiter,
    otpLimiter,
    resetPasswordLimiter
};
