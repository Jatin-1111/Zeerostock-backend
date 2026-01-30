const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
require('dotenv').config();

// Password utilities
const passwordUtils = {
    /**
     * Hash password
     */
    async hash(password) {
        const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10;
        return await bcrypt.hash(password, saltRounds);
    },

    /**
     * Compare password
     */
    async compare(password, hash) {
        return await bcrypt.compare(password, hash);
    },

    /**
     * Validate password strength
     */
    validate(password) {
        const regex = /^(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{8,}$/;
        return regex.test(password);
    }
};

// JWT utilities
const jwtUtils = {
    /**
     * Generate access token
     */
    generateAccessToken(userId, email, role, additionalData = {}) {
        return jwt.sign(
            {
                userId,
                email,
                role,
                type: 'access',
                ...additionalData
            },
            process.env.JWT_ACCESS_SECRET,
            { expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m' }
        );
    },

    /**
     * Generate refresh token
     */
    generateRefreshToken(userId) {
        return jwt.sign(
            {
                userId,
                type: 'refresh'
            },
            process.env.JWT_REFRESH_SECRET,
            { expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d' }
        );
    },

    /**
     * Verify access token
     */
    verifyAccessToken(token) {
        try {
            return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
        } catch (error) {
            return null;
        }
    },

    /**
     * Verify refresh token
     */
    verifyRefreshToken(token) {
        try {
            return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
        } catch (error) {
            return null;
        }
    },

    /**
     * Decode token without verification
     */
    decode(token) {
        return jwt.decode(token);
    },

    /**
     * Get token expiry time
     */
    getExpiryTime(expiryString) {
        const time = parseInt(expiryString);
        const unit = expiryString.slice(-1);

        const multipliers = {
            's': 1000,
            'm': 60 * 1000,
            'h': 60 * 60 * 1000,
            'd': 24 * 60 * 60 * 1000
        };

        return new Date(Date.now() + time * (multipliers[unit] || 1000));
    }
};

// OTP utilities
const otpUtils = {
    /**
     * Generate OTP
     */
    generate(length = 6) {
        const digits = '0123456789';
        let otp = '';

        for (let i = 0; i < length; i++) {
            otp += digits[Math.floor(Math.random() * 10)];
        }

        return otp;
    },

    /**
     * Get OTP expiry time
     */
    getExpiryTime(minutes = 10) {
        return new Date(Date.now() + minutes * 60 * 1000);
    }
};

// Token utilities
const tokenUtils = {
    /**
     * Generate secure random token
     */
    generate(length = 32) {
        return crypto.randomBytes(length).toString('hex');
    },

    /**
     * Generate signed token with expiry
     */
    generateSigned(data) {
        const token = crypto.randomBytes(32).toString('hex');
        const signature = crypto
            .createHmac('sha256', process.env.JWT_ACCESS_SECRET)
            .update(token + JSON.stringify(data))
            .digest('hex');

        return `${token}.${signature}`;
    },

    /**
     * Verify signed token
     */
    verifySigned(signedToken, data) {
        const [token, signature] = signedToken.split('.');
        const expectedSignature = crypto
            .createHmac('sha256', process.env.JWT_ACCESS_SECRET)
            .update(token + JSON.stringify(data))
            .digest('hex');

        return signature === expectedSignature;
    }
};

// Response utilities
const responseUtils = {
    /**
     * Success response
     */
    success(res, message, data = null, statusCode = 200) {
        return res.status(statusCode).json({
            success: true,
            message,
            data
        });
    },

    /**
     * Error response
     */
    error(res, message, statusCode = 400, errorCode = null) {
        return res.status(statusCode).json({
            success: false,
            message,
            errorCode
        });
    }
};

// Sanitization utilities
const sanitizeUtils = {
    /**
     * Sanitize user object (remove sensitive data and transform to camelCase)
     */
    sanitizeUser(user) {
        const { password_hash, otp, otp_expires_at, ...rest } = user;

        // Transform snake_case to camelCase for frontend
        return {
            id: rest.id,
            firstName: rest.first_name,
            lastName: rest.last_name,
            email: rest.business_email,
            mobile: rest.mobile,
            companyName: rest.company_name,
            gstNumber: rest.gst_number,
            roles: rest.roles || ['buyer'], // All available roles
            activeRole: rest.active_role || rest.roles?.[0] || 'buyer', // Current active role
            businessType: rest.business_type,
            isVerified: rest.is_verified,
            isActive: rest.is_active,
            lastLogin: rest.last_login,
            createdAt: rest.created_at,
            updatedAt: rest.updated_at
        };
    },

    /**
     * Sanitize input
     */
    sanitizeInput(input) {
        if (typeof input === 'string') {
            return input.trim().replace(/[<>]/g, '');
        }
        return input;
    }
};

module.exports = {
    passwordUtils,
    jwtUtils,
    otpUtils,
    tokenUtils,
    responseUtils,
    sanitizeUtils
};
