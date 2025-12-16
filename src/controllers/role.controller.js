const User = require('../models/User');
const SupplierVerification = require('../models/SupplierVerification');
const RefreshToken = require('../models/RefreshToken');
const { jwtUtils, sanitizeUtils } = require('../utils/auth.utils');
const emailService = require('../services/email.service');
const { AppError, ERROR_CODES, asyncHandler } = require('../middleware/error.middleware');
const {
    switchRoleSchema,
    requestSupplierRoleSchema,
    updateBuyerProfileSchema,
    updateSupplierProfileSchema
} = require('../validators/role.validator');

/**
 * @route   POST /api/auth/switch-role
 * @desc    Switch active role between buyer and supplier
 * @access  Private
 */
const switchRole = asyncHandler(async (req, res) => {
    // Validate request body
    const { error, value } = switchRoleSchema.validate(req.body);
    if (error) {
        throw new AppError(error.details[0].message, 400, 'VALIDATION_ERROR');
    }

    const { role } = value;
    const userId = req.userId;

    // Prevent admins from switching roles
    if (req.user.roles && req.user.roles.includes('admin')) {
        throw new AppError(
            'Admins cannot switch to buyer or supplier roles. Admin role is exclusive.',
            403,
            'ADMIN_ROLE_EXCLUSIVE'
        );
    }

    // If switching to supplier, check verification status
    if (role === 'supplier') {
        const access = await User.canAccessSupplierRole(userId);

        if (!access.hasRole && !access.status) {
            throw new AppError(
                'You have not applied for supplier access. Please submit a supplier verification request first.',
                403,
                'NO_SUPPLIER_REQUEST'
            );
        }

        if (!access.isVerified) {
            const statusMessages = {
                pending: 'Your supplier verification is pending review. Please wait for admin approval.',
                under_review: 'Your supplier verification is currently under review by our team.',
                rejected: 'Your supplier verification was rejected. Please check your email for details.'
            };

            throw new AppError(
                statusMessages[access.status] || 'You do not have verified supplier access.',
                403,
                'SUPPLIER_NOT_VERIFIED'
            );
        }
    }

    // Switch the active role
    const updatedUser = await User.switchActiveRole(userId, role);

    // Generate new tokens with updated active role
    const accessToken = jwtUtils.generateAccessToken(
        updatedUser.id,
        updatedUser.business_email,
        updatedUser.active_role
    );
    const refreshToken = jwtUtils.generateRefreshToken(updatedUser.id);

    // Store new refresh token
    const refreshTokenExpiry = jwtUtils.getExpiryTime(process.env.JWT_REFRESH_EXPIRY || '7d');
    await RefreshToken.create(updatedUser.id, refreshToken, refreshTokenExpiry.toISOString());

    res.json({
        success: true,
        message: `Switched to ${role} mode successfully`,
        data: {
            user: sanitizeUtils.sanitizeUser(updatedUser),
            accessToken,
            refreshToken,
            activeRole: updatedUser.active_role
        }
    });
});

/**
 * @route   POST /api/auth/request-supplier-role
 * @desc    Submit supplier verification request
 * @access  Private
 */
const requestSupplierRole = asyncHandler(async (req, res) => {
    const userId = req.userId;

    // Prevent admins from requesting supplier role
    if (req.user.roles && req.user.roles.includes('admin')) {
        throw new AppError(
            'Admins cannot request supplier role. Admin role is exclusive.',
            403,
            'ADMIN_ROLE_EXCLUSIVE'
        );
    }

    const {
        businessName,
        businessType,
        gstNumber,
        panNumber,
        warehouseLocations,
        productCategories,
        businessAddress,
        businessEmail,
        businessPhone,
        documents
    } = req.body;

    // Validate required fields
    if (!businessName || !businessType) {
        throw new AppError('Business name and type are required', 400, 'MISSING_FIELDS');
    }

    // Check if user already has verified supplier access
    const access = await User.canAccessSupplierRole(userId);

    if (access.isVerified) {
        throw new AppError('You already have verified supplier access', 400, 'ALREADY_VERIFIED');
    }

    if (access.status === 'pending') {
        throw new AppError('Your supplier verification request is already pending', 400, 'REQUEST_PENDING');
    }

    if (access.status === 'under_review') {
        throw new AppError('Your supplier verification is currently under review', 400, 'UNDER_REVIEW');
    }

    // Create/Update supplier profile
    const supplierProfile = await User.createSupplierProfile(userId, {
        business_name: businessName,
        business_type: businessType,
        gst_number: gstNumber || null,
        pan_number: panNumber || null,
        warehouse_locations: warehouseLocations || [],
        product_categories: productCategories || [],
        business_address: businessAddress || null,
        business_email: businessEmail || null,
        business_phone: businessPhone || null,
        gst_certificate_url: documents?.gst_certificate || null,
        pan_card_url: documents?.pan_card || null,
        business_license_url: documents?.business_license || null,
        address_proof_url: documents?.address_proof || null
    });

    // Send confirmation email to user
    const user = await User.findById(userId);
    try {
        await emailService.sendSupplierApplicationSubmitted(user.business_email, {
            fullName: `${user.first_name} ${user.last_name}`,
            businessName: businessName
        });
    } catch (error) {
        console.error('Failed to send confirmation email:', error);
        // Don't fail the request if email fails
    }

    res.status(201).json({
        success: true,
        message: 'Supplier verification request submitted successfully. Our team will review your application within 2-3 business days.',
        data: {
            supplierProfile: {
                id: supplierProfile.id,
                businessName: supplierProfile.business_name,
                verificationStatus: supplierProfile.verification_status,
                createdAt: supplierProfile.created_at
            },
            estimatedReviewTime: '2-3 business days'
        }
    });
});

/**
 * @route   GET /api/auth/roles
 * @desc    Get user roles and profiles
 * @access  Private
 */
const getUserRoles = asyncHandler(async (req, res) => {
    const userId = req.userId;

    const userWithProfiles = await User.getUserWithProfiles(userId);

    res.json({
        success: true,
        data: {
            userId: userWithProfiles.id,
            roles: userWithProfiles.roles || ['buyer'],
            activeRole: userWithProfiles.active_role || 'buyer',
            buyerProfile: userWithProfiles.buyer_profile,
            supplierProfile: userWithProfiles.supplier_profile
        }
    });
});

/**
 * @route   GET /api/auth/supplier-verification-status
 * @desc    Get supplier verification status
 * @access  Private
 */
const getSupplierVerificationStatus = asyncHandler(async (req, res) => {
    const userId = req.userId;

    const access = await User.canAccessSupplierRole(userId);

    if (!access.hasRole && !access.status) {
        return res.json({
            success: true,
            data: {
                hasApplied: false,
                status: null,
                canSwitch: false,
                message: 'You have not applied for supplier access yet.'
            }
        });
    }

    const userWithProfiles = await User.getUserWithProfiles(userId);
    const supplierProfile = userWithProfiles.supplier_profile;

    const statusMessages = {
        pending: 'Your application is waiting for admin review.',
        under_review: 'Your application is currently being reviewed by our team.',
        verified: 'Your supplier account is verified and active!',
        rejected: 'Your application was rejected. You can reapply after addressing the concerns.'
    };

    res.json({
        success: true,
        data: {
            hasApplied: true,
            status: supplierProfile.verification_status,
            isVerified: access.isVerified,
            canSwitch: access.isVerified,
            verifiedAt: supplierProfile.verified_at,
            rejectionReason: supplierProfile.rejection_reason,
            businessName: supplierProfile.business_name,
            message: statusMessages[supplierProfile.verification_status] || 'Status unknown'
        }
    });
});

/**
 * @route   PUT /api/auth/buyer-profile
 * @desc    Update buyer profile
 * @access  Private
 */
const updateBuyerProfile = asyncHandler(async (req, res) => {
    const userId = req.userId;
    const { companyName, industry, preferredCategories, budgetRange } = req.body;

    const profile = await User.createBuyerProfile(userId, {
        company_name: companyName,
        industry,
        preferred_categories: preferredCategories,
        budget_range: budgetRange
    });

    res.json({
        success: true,
        message: 'Buyer profile updated successfully',
        data: profile
    });
});

/**
 * @route   PUT /api/auth/supplier-profile
 * @desc    Update supplier profile (for resubmission)
 * @access  Private
 */
const updateSupplierProfile = asyncHandler(async (req, res) => {
    const userId = req.userId;
    const {
        businessName,
        businessType,
        gstNumber,
        panNumber,
        warehouseLocations,
        productCategories,
        businessAddress,
        businessEmail,
        businessPhone,
        documents
    } = req.body;

    // Check current status
    const access = await User.canAccessSupplierRole(userId);

    if (access.isVerified) {
        throw new AppError('Cannot update verified profile. Contact support for changes.', 400, 'PROFILE_VERIFIED');
    }

    const profile = await User.createSupplierProfile(userId, {
        business_name: businessName,
        business_type: businessType,
        gst_number: gstNumber,
        pan_number: panNumber,
        warehouse_locations: warehouseLocations,
        product_categories: productCategories,
        business_address: businessAddress,
        business_email: businessEmail,
        business_phone: businessPhone,
        gst_certificate_url: documents?.gst_certificate,
        pan_card_url: documents?.pan_card,
        business_license_url: documents?.business_license,
        address_proof_url: documents?.address_proof
    });

    res.json({
        success: true,
        message: 'Supplier profile updated successfully',
        data: profile
    });
});

module.exports = {
    switchRole,
    requestSupplierRole,
    getUserRoles,
    getSupplierVerificationStatus,
    updateBuyerProfile,
    updateSupplierProfile
};
