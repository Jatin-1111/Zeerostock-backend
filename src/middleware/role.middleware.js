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

    if (req.role !== 'buyer') {
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

    if (req.role !== 'supplier') {
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

    if (req.role !== 'admin') {
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

        if (!roles.includes(req.role)) {
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

/**
 * Check if user is a super admin
 */
exports.requireSuperAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }

    console.log('🔍 Super Admin Check:', {
        userId: req.user.id,
        roles: req.user.roles,
        isSuperAdmin: req.user.isSuperAdmin
    });

    // Check if user has super_admin role OR is_super_admin flag
    const isSuperAdmin =
        (req.user.roles && req.user.roles.includes('super_admin')) ||
        req.user.isSuperAdmin === true;

    if (!isSuperAdmin) {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Super admin privileges required.'
        });
    }

    next();
};

/**
 * Check if user is admin or super admin
 */
exports.requireAdminOrSuperAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }

    // Check if user has admin or super_admin role
    const hasAdminRole = req.user.roles && (
        req.user.roles.includes('admin') ||
        req.user.roles.includes('super_admin')
    );

    if (!hasAdminRole) {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Admin privileges required.'
        });
    }

    next();
};
