/**
 * Role-based authorization middleware
 * Checks if authenticated user has required role
 */

/**
 * Check if user is a buyer
 */
exports.requireBuyer = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }

    if (req.user.role !== 'buyer') {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Buyer role required.'
        });
    }

    next();
};

/**
 * Check if user is a supplier
 */
exports.requireSupplier = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }

    if (req.user.role !== 'supplier') {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Supplier role required.'
        });
    }

    next();
};

/**
 * Check if user is an admin
 */
exports.requireAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }

    if (req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Admin role required.'
        });
    }

    next();
};

/**
 * Check if user has one of the specified roles
 */
exports.requireRoles = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `Access denied. Required roles: ${roles.join(', ')}`
            });
        }

        next();
    };
};

/**
 * Check if user is buyer or admin
 */
exports.requireBuyerOrAdmin = exports.requireRoles('buyer', 'admin');

/**
 * Check if user is supplier or admin
 */
exports.requireSupplierOrAdmin = exports.requireRoles('supplier', 'admin');
