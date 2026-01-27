/**
 * Admin Management Controller
 * Handles admin user creation, management, and credential operations
 * Only accessible by super_admin role
 */

const Admin = require('../models/Admin');
const { passwordUtils } = require('../utils/auth.utils');
const credentialUtils = require('../utils/credential.utils');
const emailService = require('../services/email.service');
const { AppError, ERROR_CODES, asyncHandler } = require('../middleware/error.middleware');
const { v4: uuidv4 } = require('uuid');

/**
 * @route   GET /api/admin/admins
 * @desc    Get all admin users
 * @access  Private (super_admin only)
 */
const getAllAdmins = asyncHandler(async (req, res) => {
    const admins = await Admin.getAllAdmins();

    // Sanitize response - remove sensitive fields
    const sanitizedAdmins = admins.map(admin => {
        // Determine roles array for frontend compatibility
        const isSuperAdmin = admin.role === 'super_admin';
        const roles = isSuperAdmin ? ['super_admin', 'admin'] : ['admin'];

        return {
            id: admin.id,
            adminId: admin.admin_id,
            name: `${admin.first_name} ${admin.last_name}`,
            firstName: admin.first_name,
            lastName: admin.last_name,
            email: admin.email,
            role: admin.role,
            roles: roles, // Frontend expects array
            isFirstLogin: admin.is_first_login || false,
            credentialsExpireAt: admin.credentials_expire_at,
            credentialsUsed: admin.credentials_used || false, // Note: Schema might use different field or not exist
            accountLocked: admin.admin_locked || admin.account_locked || false, // Check schema
            lockUntil: admin.lock_until,
            isActive: admin.is_active,
            lastLogin: admin.last_login,
            createdAt: admin.created_at,
            timeUntilExpiry: admin.credentials_expire_at ?
                credentialUtils.getTimeUntilExpiry(admin.credentials_expire_at) : null
        };
    });

    res.json({
        success: true,
        data: sanitizedAdmins,
        count: sanitizedAdmins.length
    });
});

/**
 * @route   POST /api/admin/admins
 * @desc    Create a new admin user
 * @access  Private (super_admin only)
 */
const createAdmin = asyncHandler(async (req, res) => {
    const { firstName, lastName, email, role = 'admin' } = req.body;

    // Validate input
    if (!firstName || !lastName || !email) {
        throw new AppError(
            'First name, last name, and email are required',
            400,
            ERROR_CODES.VALIDATION_ERROR
        );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        throw new AppError(
            'Invalid email format',
            400,
            ERROR_CODES.VALIDATION_ERROR
        );
    }

    // Validate role
    if (!['admin', 'super_admin'].includes(role)) {
        throw new AppError(
            'Invalid role. Must be "admin" or "super_admin"',
            400,
            ERROR_CODES.VALIDATION_ERROR
        );
    }

    // Check if email already exists
    const existingAdmin = await Admin.findByEmail(email);
    if (existingAdmin) {
        throw new AppError(
            'An admin with this email already exists',
            400,
            ERROR_CODES.USER_EXISTS
        );
    }

    // Generate unique admin ID
    let adminId;
    let attempts = 0;
    // Note: Admin model might not have adminIdExists, assuming findByAdminId returns null if not found
    do {
        adminId = credentialUtils.generateAdminId();
        attempts++;
        if (attempts > 10) {
            throw new AppError(
                'Failed to generate unique admin ID. Please try again.',
                500,
                ERROR_CODES.INTERNAL_ERROR
            );
        }
    } while (await Admin.findByAdminId(adminId));

    // Generate temporary password
    const tempPassword = credentialUtils.generateTempPassword(adminId);
    const passwordHash = await passwordUtils.hash(tempPassword);

    // Calculate credential expiry (24 hours)
    const credentialsExpireAt = credentialUtils.calculateExpiryTime(24);

    // Create admin user
    const adminData = {
        id: uuidv4(),
        admin_id: adminId,
        first_name: firstName,
        last_name: lastName,
        email: email,
        password_hash: passwordHash,
        role: role, // Singular role field in admins table
        is_first_login: true,
        credentials_expire_at: credentialsExpireAt,
        credentials_used: false,
        is_active: true,
        failed_login_attempts: 0,
        account_locked: false,
        created_at: new Date().toISOString()
    };

    const newAdmin = await Admin.create(adminData);

    // Send credentials email
    const emailSent = await emailService.sendAdminCredentials({
        email,
        name: `${firstName} ${lastName}`,
        adminId,
        tempPassword,
        expiresIn: '24 hours'
    });

    res.status(201).json({
        success: true,
        message: `Admin created successfully. ${emailSent ? 'Credentials sent to email.' : 'Email sending failed - please share credentials manually.'}`,
        data: {
            id: newAdmin.id,
            adminId: newAdmin.admin_id,
            name: `${newAdmin.first_name} ${newAdmin.last_name}`,
            email: newAdmin.email,
            role: newAdmin.role,
            emailSent,
            // Only include credentials in response if email failed (for manual sharing)
            credentials: !emailSent ? {
                adminId,
                tempPassword
            } : undefined
        }
    });
});

/**
 * @route   POST /api/admin/admins/:id/reset-password
 * @desc    Reset admin password
 * @access  Private (super_admin only)
 */
const resetAdminPassword = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Get admin user
    const admin = await Admin.findById(id);

    if (!admin) {
        throw new AppError(
            'Admin not found',
            404,
            ERROR_CODES.USER_NOT_FOUND
        );
    }

    // Prevent super_admin from resetting their own password (for security)
    if (admin.id === req.user.id) {
        throw new AppError(
            'You cannot reset your own password. Use the password change feature instead.',
            400,
            ERROR_CODES.VALIDATION_ERROR
        );
    }

    // Generate new temporary password
    const tempPassword = credentialUtils.generateTempPassword(admin.admin_id);
    const passwordHash = await passwordUtils.hash(tempPassword);

    // Calculate credential expiry (24 hours)
    const credentialsExpireAt = credentialUtils.calculateExpiryTime(24);

    // Update admin credentials
    await Admin.updateAdminCredentials(id, {
        password_hash: passwordHash,
        is_first_login: true,
        credentials_expire_at: credentialsExpireAt,
        credentials_used: false,
        account_locked: false,
        failed_login_attempts: 0,
        lock_until: null
    });

    // Send password reset email
    const emailSent = await emailService.sendAdminPasswordReset({
        email: admin.email,
        name: `${admin.first_name} ${admin.last_name}`,
        adminId: admin.admin_id,
        tempPassword
    });

    res.json({
        success: true,
        message: `Password reset successfully. ${emailSent ? 'New credentials sent to email.' : 'Email sending failed - please share credentials manually.'}`,
        data: {
            adminId: admin.admin_id,
            email: admin.email,
            emailSent,
            // Only include credentials in response if email failed
            credentials: !emailSent ? {
                adminId: admin.admin_id,
                tempPassword
            } : undefined
        }
    });
});

/**
 * @route   POST /api/admin/admins/:id/resend-credentials
 * @desc    Resend admin credentials
 * @access  Private (super_admin only)
 */
const resendCredentials = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Get admin user
    const admin = await Admin.findById(id);

    if (!admin) {
        throw new AppError(
            'Admin not found',
            404,
            ERROR_CODES.USER_NOT_FOUND
        );
    }

    // Check if admin has already used credentials
    if (admin.credentials_used || !admin.is_first_login) {
        throw new AppError(
            'Admin has already activated their account. Use password reset instead.',
            400,
            ERROR_CODES.VALIDATION_ERROR
        );
    }

    // Check if credentials are expired
    const expired = credentialUtils.areCredentialsExpired(admin.credentials_expire_at);

    if (expired) {
        // Generate new credentials
        const tempPassword = credentialUtils.generateTempPassword(admin.admin_id);
        const passwordHash = await passwordUtils.hash(tempPassword);
        const credentialsExpireAt = credentialUtils.calculateExpiryTime(24);

        await Admin.updateAdminCredentials(id, {
            password_hash: passwordHash,
            credentials_expire_at: credentialsExpireAt
        });

        // Send new credentials
        const emailSent = await emailService.sendAdminCredentials({
            email: admin.email,
            name: `${admin.first_name} ${admin.last_name}`,
            adminId: admin.admin_id,
            tempPassword,
            expiresIn: '24 hours'
        });

        return res.json({
            success: true,
            message: 'New credentials generated and sent',
            data: { emailSent }
        });
    }

    // Resend existing credentials (we can't retrieve the password, so we'll reset it)
    const tempPassword = credentialUtils.generateTempPassword(admin.admin_id);
    const passwordHash = await passwordUtils.hash(tempPassword);

    await Admin.updateAdminCredentials(id, {
        password_hash: passwordHash
    });

    const emailSent = await emailService.sendAdminCredentials({
        email: admin.email,
        name: `${admin.first_name} ${admin.last_name}`,
        adminId: admin.admin_id,
        tempPassword,
        expiresIn: credentialUtils.getTimeUntilExpiry(admin.credentials_expire_at) || '24 hours'
    });

    res.json({
        success: true,
        message: `Credentials resent. ${emailSent ? 'Email sent successfully.' : 'Email failed - share credentials manually.'}`,
        data: {
            emailSent,
            credentials: !emailSent ? {
                adminId: admin.admin_id,
                tempPassword
            } : undefined
        }
    });
});

/**
 * @route   PATCH /api/admin/admins/:id/deactivate
 * @desc    Deactivate admin account
 * @access  Private (super_admin only)
 */
const deactivateAdmin = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Get admin user
    const admin = await Admin.findById(id);

    if (!admin) {
        throw new AppError(
            'Admin not found',
            404,
            ERROR_CODES.USER_NOT_FOUND
        );
    }

    // Prevent super_admin from deactivating themselves
    if (admin.id === req.user.id) {
        throw new AppError(
            'You cannot deactivate your own account',
            400,
            ERROR_CODES.VALIDATION_ERROR
        );
    }

    // Deactivate admin
    await Admin.update(id, { is_active: false });

    res.json({
        success: true,
        message: 'Admin deactivated successfully',
        data: {
            adminId: admin.admin_id,
            email: admin.email
        }
    });
});

/**
 * @route   PATCH /api/admin/admins/:id/activate
 * @desc    Activate admin account
 * @access  Private (super_admin only)
 */
const activateAdmin = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Get admin user
    const admin = await Admin.findById(id);

    if (!admin) {
        throw new AppError(
            'Admin not found',
            404,
            ERROR_CODES.USER_NOT_FOUND
        );
    }

    // Activate admin
    await Admin.update(id, { is_active: true });

    res.json({
        success: true,
        message: 'Admin activated successfully',
        data: {
            adminId: admin.admin_id,
            email: admin.email
        }
    });
});

/**
 * @route   DELETE /api/admin/admins/:id
 * @desc    Delete admin account (permanent)
 * @access  Private (super_admin only)
 */
const deleteAdmin = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Get admin user
    const admin = await Admin.findById(id);

    if (!admin) {
        throw new AppError(
            'Admin not found',
            404,
            ERROR_CODES.USER_NOT_FOUND
        );
    }

    // Prevent super_admin from deleting themselves
    if (admin.id === req.user.id) {
        throw new AppError(
            'You cannot delete your own account',
            400,
            ERROR_CODES.VALIDATION_ERROR
        );
    }

    // Prevent deletion of super_admin accounts
    if (admin.role === 'super_admin') {
        throw new AppError(
            'Super admin accounts cannot be deleted',
            403,
            ERROR_CODES.FORBIDDEN
        );
    }

    await Admin.delete(id);

    res.json({
        success: true,
        message: 'Admin deleted permanently',
        data: {
            adminId: admin.admin_id,
            email: admin.email
        }
    });
});

module.exports = {
    getAllAdmins,
    createAdmin,
    resetAdminPassword,
    resendCredentials,
    deactivateAdmin,
    activateAdmin,
    deleteAdmin
};
