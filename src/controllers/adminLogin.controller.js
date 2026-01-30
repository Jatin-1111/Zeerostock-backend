/**
 * Admin Login Controller
 * Handles admin-specific authentication with adminId
 */

const Admin = require('../models/Admin');
const RefreshToken = require('../models/RefreshToken');
const AdminRefreshToken = require('../models/AdminRefreshToken');
const { passwordUtils, jwtUtils } = require('../utils/auth.utils');
const credentialUtils = require('../utils/credential.utils');
const { redisHelpers } = require('../config/redis');
const { AppError, ERROR_CODES, asyncHandler } = require('../middleware/error.middleware');

/**
 * @route   POST /auth/admin/login
 * @desc    Admin login with adminId and password
 * @access  Public
 */
const adminLogin = asyncHandler(async (req, res) => {
    const { adminId, password } = req.body;

    // Validate input
    if (!adminId || !password) {
        throw new AppError(
            'Admin ID and password are required',
            400,
            ERROR_CODES.VALIDATION_ERROR
        );
    }

    // Find admin by adminId
    const admin = await Admin.findByAdminId(adminId);

    if (!admin) {
        throw new AppError(
            'Invalid credentials',
            401,
            ERROR_CODES.INVALID_CREDENTIALS
        );
    }

    // Verify user is an admin
    // Admins table uses singular 'role'
    if (admin.role !== 'admin' && admin.role !== 'super_admin') {
        throw new AppError(
            'Invalid credentials',
            401,
            ERROR_CODES.INVALID_CREDENTIALS
        );
    }

    // Check if account is active
    if (!admin.is_active) {
        throw new AppError(
            'Your account has been deactivated. Please contact your administrator.',
            403,
            ERROR_CODES.USER_INACTIVE
        );
    }

    // Check if account is locked
    if (admin.account_locked && admin.lock_until) {
        const lockUntil = new Date(admin.lock_until);
        if (lockUntil > new Date()) {
            const minutesRemaining = Math.ceil((lockUntil - new Date()) / 60000);
            throw new AppError(
                `Account locked due to multiple failed login attempts. Try again in ${minutesRemaining} minutes.`,
                403,
                ERROR_CODES.ACCOUNT_LOCKED
            );
        } else {
            // Lock expired, unlock account
            await Admin.resetFailedLoginAttempts(admin.id);
        }
    }

    // Check if credentials have expired (for first login)
    if (admin.is_first_login && admin.credentials_expire_at) {
        const expired = credentialUtils.areCredentialsExpired(admin.credentials_expire_at);
        if (expired) {
            throw new AppError(
                'Your credentials have expired. Please contact your administrator for new credentials.',
                403,
                ERROR_CODES.CREDENTIALS_EXPIRED
            );
        }
    }

    // Verify password
    const isPasswordValid = await passwordUtils.compare(password, admin.password_hash);

    if (!isPasswordValid) {
        // Increment failed login attempts
        await Admin.incrementFailedLoginAttempts(admin.id);

        const attempts = (admin.failed_login_attempts || 0) + 1;
        const remaining = Math.max(0, 5 - attempts);

        if (remaining === 0) {
            throw new AppError(
                'Account locked due to multiple failed login attempts. Try again in 30 minutes.',
                403,
                ERROR_CODES.ACCOUNT_LOCKED
            );
        }

        throw new AppError(
            `Invalid credentials. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`,
            401,
            ERROR_CODES.INVALID_CREDENTIALS
        );
    }

    // Reset failed login attempts on successful login
    if (admin.failed_login_attempts > 0) {
        await Admin.resetFailedLoginAttempts(admin.id);
    }

    // Check if first login (force password change)
    if (admin.is_first_login) {
        // Generate a temporary token for password change
        const tempToken = jwtUtils.generateAccessToken(admin.id, admin.email, 'temp_admin');

        return res.json({
            success: true,
            requiresPasswordChange: true,
            message: 'Please change your password to continue',
            data: {
                tempToken,
                adminId: admin.admin_id || admin.email,
                user: {
                    id: admin.id,
                    name: `${admin.first_name || ''} ${admin.last_name || ''}`.trim(),
                    email: admin.email
                }
            }
        });
    }

    // Update last login (fire and forget)
    Admin.updateLastLogin(admin.id).catch(err => console.error('Failed to update admin last login:', err));

    // Determine admin role (could be admin or super_admin)
    const adminRole = admin.role;
    const isSuperAdmin = admin.role === 'super_admin';
    const rolesArray = isSuperAdmin ? ['super_admin', 'admin'] : ['admin'];

    console.log('🔍 Admin login debug:', {
        role: admin.role,
        isSuperAdmin,
        rolesArray
    });

    // Generate tokens with isSuperAdmin flag
    const accessToken = jwtUtils.generateAccessToken(
        admin.id,
        admin.email,
        adminRole,
        { isSuperAdmin, roles: rolesArray }
    );
    const refreshToken = jwtUtils.generateRefreshToken(admin.id);

    // Store refresh token
    const refreshTokenExpiry = jwtUtils.getExpiryTime(process.env.JWT_REFRESH_EXPIRY || '7d');
    await AdminRefreshToken.create(admin.id, refreshToken, refreshTokenExpiry.toISOString());
    await redisHelpers.storeRefreshToken(admin.id, refreshToken, 7 * 24 * 60 * 60);

    res.json({
        success: true,
        message: 'Login successful',
        data: {
            user: {
                id: admin.id,
                adminId: admin.admin_id,
                name: `${admin.first_name || ''} ${admin.last_name || ''}`.trim(),
                firstName: admin.first_name,
                lastName: admin.last_name,
                email: admin.email,
                role: adminRole,
                roles: rolesArray,
                isSuperAdmin
            },
            accessToken,
            refreshToken
        }
    });
});

/**
 * @route   POST /auth/admin/change-password
 * @desc    Change admin password (first login or password reset)
 * @access  Private (temp token required)
 */
const changeAdminPassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    // Validate input
    if (!currentPassword || !newPassword || !confirmPassword) {
        throw new AppError(
            'All fields are required',
            400,
            ERROR_CODES.VALIDATION_ERROR
        );
    }

    if (newPassword !== confirmPassword) {
        throw new AppError(
            'New password and confirm password do not match',
            400,
            ERROR_CODES.VALIDATION_ERROR
        );
    }

    // Validate password strength
    const validation = credentialUtils.validatePasswordStrength(newPassword);
    if (!validation.isValid) {
        throw new AppError(
            validation.errors.join(', '),
            400,
            ERROR_CODES.WEAK_PASSWORD
        );
    }

    // Get admin from request (set by auth middleware)
    const admin = await Admin.findById(req.user.id);

    if (!admin) {
        throw new AppError(
            'Admin not found',
            404,
            ERROR_CODES.USER_NOT_FOUND
        );
    }

    // Verify current password
    const isPasswordValid = await passwordUtils.compare(currentPassword, admin.password_hash);

    if (!isPasswordValid) {
        throw new AppError(
            'Current password is incorrect',
            401,
            ERROR_CODES.INVALID_CREDENTIALS
        );
    }

    // Check if new password is same as current password
    const isSameAsOld = await passwordUtils.compare(newPassword, admin.password_hash);
    if (isSameAsOld) {
        throw new AppError(
            'New password must be different from current password',
            400,
            ERROR_CODES.VALIDATION_ERROR
        );
    }

    // Hash new password
    const newPasswordHash = await passwordUtils.hash(newPassword);

    // Update password and mark as not first login
    await Admin.updateAdminCredentials(admin.id, {
        password_hash: newPasswordHash,
        is_first_login: false,
        credentials_used: true,
        credentials_expire_at: null
    });

    // Determine admin role
    const adminRole = admin.role;
    const isSuperAdmin = admin.role === 'super_admin';
    const rolesArray = isSuperAdmin ? ['super_admin', 'admin'] : ['admin'];

    // Generate new tokens with isSuperAdmin flag
    const accessToken = jwtUtils.generateAccessToken(
        admin.id,
        admin.email,
        adminRole,
        { isSuperAdmin, roles: rolesArray }
    );
    const refreshToken = jwtUtils.generateRefreshToken(admin.id);

    // Store refresh token
    const refreshTokenExpiry = jwtUtils.getExpiryTime(process.env.JWT_REFRESH_EXPIRY || '7d');
    await AdminRefreshToken.create(admin.id, refreshToken, refreshTokenExpiry.toISOString());
    await redisHelpers.storeRefreshToken(admin.id, refreshToken, 7 * 24 * 60 * 60);

    res.json({
        success: true,
        message: 'Password changed successfully',
        data: {
            user: {
                id: admin.id,
                adminId: admin.admin_id,
                name: `${admin.first_name || ''} ${admin.last_name || ''}`.trim(),
                firstName: admin.first_name,
                lastName: admin.last_name,
                email: admin.email,
                role: adminRole,
                roles: rolesArray
            },
            accessToken,
            refreshToken
        }
    });
});

/**
 * @route   GET /auth/admin/me
 * @desc    Get current admin info from JWT token (source of truth)
 * @access  Private (admin token required)
 */
const getAdminMe = asyncHandler(async (req, res) => {
    // Get user ID from verified token (set by verifyToken middleware)
    const userId = req.userId;

    if (!userId) {
        throw new AppError(
            'Unauthorized',
            401,
            ERROR_CODES.UNAUTHORIZED
        );
    }

    // Fetch admin from database
    const admin = await Admin.findById(userId);

    if (!admin) {
        throw new AppError(
            'Admin not found',
            404,
            ERROR_CODES.NOT_FOUND
        );
    }

    // Verify user is still an admin
    if (admin.role !== 'admin' && admin.role !== 'super_admin') {
        throw new AppError(
            'Access denied. Admin privileges required.',
            403,
            ERROR_CODES.FORBIDDEN
        );
    }

    // Check if account is still active
    if (!admin.is_active) {
        throw new AppError(
            'Your account has been deactivated.',
            403,
            ERROR_CODES.USER_INACTIVE
        );
    }

    // Determine admin role
    const adminRole = admin.role;
    const isSuperAdmin = admin.role === 'super_admin';
    const rolesArray = isSuperAdmin ? ['super_admin', 'admin'] : ['admin'];

    // Return admin info from database (source of truth)
    res.json({
        success: true,
        data: {
            id: admin.id,
            adminId: admin.admin_id,
            name: `${admin.first_name || ''} ${admin.last_name || ''}`.trim(),
            firstName: admin.first_name,
            lastName: admin.last_name,
            email: admin.email,
            role: adminRole,
            roles: rolesArray,
            isSuperAdmin,
            isActive: admin.is_active,
            lastLogin: admin.last_login
        }
    });
});

module.exports = {
    adminLogin,
    changeAdminPassword,
    getAdminMe
};
