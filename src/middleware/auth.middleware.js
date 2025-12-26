const { jwtUtils, responseUtils } = require('../utils/auth.utils');
const { AppError, ERROR_CODES } = require('./error.middleware');
const User = require('../models/User');
const UserRole = require('../models/UserRole');

/**
 * Verify JWT token middleware
 */
const verifyToken = async (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new AppError(
                'No token provided',
                401,
                ERROR_CODES.UNAUTHORIZED
            );
        }

        const token = authHeader.substring(7);

        // Verify token
        const decoded = jwtUtils.verifyAccessToken(token);

        if (!decoded) {
            throw new AppError(
                'Invalid or expired token',
                401,
                ERROR_CODES.TOKEN_EXPIRED
            );
        }

        // Get user from database
        const user = await User.findById(decoded.userId);

        if (!user) {
            throw new AppError(
                'User not found',
                401,
                ERROR_CODES.USER_NOT_FOUND
            );
        }

        if (!user.is_active) {
            throw new AppError(
                'User account is inactive',
                401,
                ERROR_CODES.USER_INACTIVE
            );
        }

        // **MULTI-ROLE VALIDATION**: Verify token role matches user's active role
        // Skip this check for admin/super_admin roles (they use users.roles array)
        if (decoded.role && decoded.role !== 'admin' && decoded.role !== 'super_admin' && decoded.role !== 'temp_admin') {
            const userRole = await UserRole.findByUserAndRole(decoded.userId, decoded.role);

            if (!userRole) {
                throw new AppError(
                    'Invalid role in token. Please log in again.',
                    401,
                    ERROR_CODES.INVALID_TOKEN
                );
            }

            if (!userRole.is_active) {
                throw new AppError(
                    `Your ${decoded.role} role is not active. Please contact support.`,
                    403,
                    ERROR_CODES.ROLE_INACTIVE
                );
            }

            // Attach role information to request
            req.userRole = userRole;
            req.role = decoded.role;
        }

        // Attach decoded data to user object for admin routes
        if (decoded.isSuperAdmin !== undefined) {
            user.isSuperAdmin = decoded.isSuperAdmin;
        }
        if (decoded.roles) {
            user.roles = decoded.roles;
        }

        // Attach user to request
        req.user = user;
        req.userId = decoded.userId;

        next();
    } catch (error) {
        next(error);
    }
};

/**
 * Verify user is verified middleware
 */
const verifyUserVerified = (req, res, next) => {
    if (!req.user.is_verified) {
        throw new AppError(
            'Please verify your account first',
            403,
            ERROR_CODES.USER_NOT_VERIFIED
        );
    }
    next();
};

/**
 * Role-based access control middleware
 */
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            throw new AppError(
                'User not authenticated',
                401,
                ERROR_CODES.UNAUTHORIZED
            );
        }

        if (!roles.includes(req.role)) {
            throw new AppError(
                'You do not have permission to access this resource',
                403,
                'FORBIDDEN'
            );
        }

        next();
    };
};

/**
 * Optional authentication middleware
 * Attaches user if token is valid, but doesn't fail if not
 */
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const decoded = jwtUtils.verifyAccessToken(token);

            if (decoded) {
                const user = await User.findById(decoded.userId);
                if (user && user.is_active) {
                    req.user = user;
                    req.userId = decoded.userId;
                }
            }
        }
    } catch (error) {
        // Silently fail for optional auth
    }

    next();
};

/**
 * Require specific role(s) middleware
 * User must have at least one of the specified roles
 */
const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            throw new AppError(
                'User not authenticated',
                401,
                ERROR_CODES.UNAUTHORIZED
            );
        }

        // Check against the active role from JWT token (req.role)
        if (!req.role) {
            throw new AppError(
                'User role not found in token. Please log in again.',
                401,
                ERROR_CODES.UNAUTHORIZED
            );
        }

        const hasRole = roles.includes(req.role);

        if (!hasRole) {
            throw new AppError(
                `Access denied. Required role(s): ${roles.join(' or ')}. Your active role: ${req.role}`,
                403,
                ERROR_CODES.FORBIDDEN
            );
        }

        next();
    };
};

/**
 * Check if user has any of the specified roles
 * Utility function for use in controllers
 */
const hasAnyRole = (user, ...roles) => {
    if (!user || !user.roles || !Array.isArray(user.roles)) {
        return false;
    }
    return roles.some(role => user.roles.includes(role));
};

/**
 * Require active role middleware
 * User's active_role must match one of the specified roles
 */
const requireActiveRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            throw new AppError(
                'User not authenticated',
                401,
                ERROR_CODES.UNAUTHORIZED
            );
        }

        if (!req.user.active_role) {
            throw new AppError(
                'User active role not set',
                403,
                ERROR_CODES.FORBIDDEN
            );
        }

        if (!roles.includes(req.user.active_role)) {
            throw new AppError(
                `Access denied. Required active role(s): ${roles.join(' or ')}. Current role: ${req.user.active_role}`,
                403,
                ERROR_CODES.FORBIDDEN
            );
        }

        next();
    };
};

module.exports = {
    verifyToken,
    verifyUserVerified,
    authorize,
    optionalAuth,
    requireRole,
    hasAnyRole,
    requireActiveRole
};
