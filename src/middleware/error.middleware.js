// Custom error codes for the application
const ERROR_CODES = {
    // User errors
    USER_ALREADY_EXISTS: 'USER_ALREADY_EXISTS',
    USER_NOT_FOUND: 'USER_NOT_FOUND',
    USER_NOT_VERIFIED: 'USER_NOT_VERIFIED',
    USER_INACTIVE: 'USER_INACTIVE',

    // Authentication errors
    INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
    INVALID_PASSWORD_FORMAT: 'INVALID_PASSWORD_FORMAT',
    INVALID_TOKEN: 'INVALID_TOKEN',
    TOKEN_EXPIRED: 'TOKEN_EXPIRED',
    REFRESH_TOKEN_EXPIRED: 'REFRESH_TOKEN_EXPIRED',
    UNAUTHORIZED: 'UNAUTHORIZED',

    // OTP errors
    INVALID_OTP: 'INVALID_OTP',
    OTP_EXPIRED: 'OTP_EXPIRED',
    OTP_SEND_FAILED: 'OTP_SEND_FAILED',

    // Validation errors
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    INVALID_EMAIL: 'INVALID_EMAIL',
    INVALID_MOBILE: 'INVALID_MOBILE',
    INVALID_GST: 'INVALID_GST',

    // Rate limiting
    TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',
    RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

    // Password reset
    RESET_TOKEN_INVALID: 'RESET_TOKEN_INVALID',
    RESET_TOKEN_EXPIRED: 'RESET_TOKEN_EXPIRED',
    PASSWORD_RESET_FAILED: 'PASSWORD_RESET_FAILED',

    // Server errors
    INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
    DATABASE_ERROR: 'DATABASE_ERROR',
    EMAIL_SEND_FAILED: 'EMAIL_SEND_FAILED',
    SMS_SEND_FAILED: 'SMS_SEND_FAILED',

    // Google OAuth
    GOOGLE_AUTH_FAILED: 'GOOGLE_AUTH_FAILED',
    INVALID_GOOGLE_TOKEN: 'INVALID_GOOGLE_TOKEN'
};

// Custom error class
class AppError extends Error {
    constructor(message, statusCode, errorCode) {
        super(message);
        this.statusCode = statusCode;
        this.errorCode = errorCode;
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

// Error handler middleware
const errorHandler = (err, req, res, next) => {
    let { statusCode, message, errorCode } = err;

    // Default to 500 if statusCode not set
    statusCode = statusCode || 500;
    errorCode = errorCode || ERROR_CODES.INTERNAL_SERVER_ERROR;

    // Log error for debugging
    if (statusCode === 500) {
        console.error('Error:', err);
    }

    // Send response
    res.status(statusCode).json({
        success: false,
        message: message || 'Something went wrong',
        errorCode,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};

// Async handler wrapper to catch errors in async route handlers
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

// Not found handler
const notFound = (req, res, next) => {
    const error = new AppError(
        `Route ${req.originalUrl} not found`,
        404,
        'NOT_FOUND'
    );
    next(error);
};

module.exports = {
    ERROR_CODES,
    AppError,
    errorHandler,
    asyncHandler,
    notFound
};
