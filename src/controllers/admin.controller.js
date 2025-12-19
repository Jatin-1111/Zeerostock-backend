const SupplierVerification = require('../models/SupplierVerification');
const User = require('../models/User');
const emailService = require('../services/email.service');
const { AppError, ERROR_CODES, asyncHandler } = require('../middleware/error.middleware');
const {
    approveVerificationSchema,
    rejectVerificationSchema,
    markUnderReviewSchema,
    getAllVerificationsQuerySchema,
    getPendingVerificationsQuerySchema
} = require('../validators/admin.validator');

/**
 * @route   GET /api/admin/supplier-verifications
 * @desc    Get all pending supplier verifications
 * @access  Private (Admin only)
 */
const getPendingVerifications = asyncHandler(async (req, res) => {
    // Validate query parameters
    const { error, value } = getPendingVerificationsQuerySchema.validate(req.query);
    if (error) {
        throw new AppError(error.details[0].message, 400, 'VALIDATION_ERROR');
    }

    const { page, limit, status } = value;
    const offset = (page - 1) * limit;

    const verifications = await SupplierVerification.getPendingVerifications(
        limit,
        offset,
        status
    );

    const stats = await SupplierVerification.getStats();

    res.json({
        success: true,
        data: {
            verifications,
            stats,
            pagination: {
                page,
                limit,
                total: stats.pending_count + stats.under_review_count
            }
        }
    });
});

/**
 * @route   GET /api/admin/supplier-verifications/:id
 * @desc    Get single supplier verification details
 * @access  Private (Admin only)
 */
const getVerificationDetails = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const verification = await SupplierVerification.getById(id);

    if (!verification) {
        throw new AppError('Verification request not found', 404, ERROR_CODES.NOT_FOUND);
    }

    const history = await SupplierVerification.getHistory(id);

    res.json({
        success: true,
        data: {
            verification,
            history
        }
    });
});

/**
 * @route   POST /api/admin/supplier-verifications/:id/approve
 * @desc    Approve supplier verification
 * @access  Private (Admin only)
 */
const approveVerification = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { notes } = req.body;
    const adminId = req.userId;

    const verification = await SupplierVerification.getById(id);

    if (!verification) {
        throw new AppError('Verification request not found', 404, ERROR_CODES.NOT_FOUND);
    }

    if (verification.verification_status === 'verified') {
        throw new AppError('This supplier is already verified', 400, 'ALREADY_VERIFIED');
    }

    // Update status to verified
    const updatedProfile = await SupplierVerification.updateStatus(
        id,
        'verified',
        notes || 'Supplier verification approved by admin',
        adminId
    );

    // Add supplier role to user_roles table (or activate if exists)
    const UserRole = require('../models/UserRole');
    await UserRole.upsert(verification.user_id, 'supplier', {
        is_active: true,
        verification_status: 'verified',
        verified_at: new Date().toISOString()
    });

    // Send approval email to supplier
    const user = verification.users;
    try {
        await emailService.sendSupplierApproved(user.business_email, {
            fullName: `${user.first_name} ${user.last_name}`,
            businessName: updatedProfile.business_name
        });
    } catch (error) {
        console.error('Failed to send approval email:', error);
        // Don't fail the request if email fails
    }

    res.json({
        success: true,
        message: 'Supplier verification approved successfully. User can now login as supplier.',
        data: {
            profile: updatedProfile,
            supplierRoleAdded: true,
            supplierCanNowLogin: true
        }
    });
});

/**
 * @route   POST /api/admin/supplier-verifications/:id/reject
 * @desc    Reject supplier verification
 * @access  Private (Admin only)
 */
const rejectVerification = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;
    const adminId = req.userId;

    if (!reason || reason.trim().length === 0) {
        throw new AppError('Rejection reason is required', 400, 'MISSING_REASON');
    }

    const verification = await SupplierVerification.getById(id);

    if (!verification) {
        throw new AppError('Verification request not found', 404, ERROR_CODES.NOT_FOUND);
    }

    // Update status to rejected
    const updatedProfile = await SupplierVerification.updateStatus(
        id,
        'rejected',
        reason,
        adminId
    );

    // Send rejection email to supplier
    const user = verification.users;
    try {
        await emailService.sendSupplierRejected(user.business_email, {
            fullName: `${user.first_name} ${user.last_name}`,
            businessName: updatedProfile.business_name,
            reason: reason
        });
    } catch (error) {
        console.error('Failed to send rejection email:', error);
        // Don't fail the request if email fails
    }

    res.json({
        success: true,
        message: 'Supplier verification rejected',
        data: {
            profile: updatedProfile,
            rejectionReason: reason
        }
    });
});

/**
 * @route   POST /api/admin/supplier-verifications/:id/review
 * @desc    Mark verification as under review
 * @access  Private (Admin only)
 */
const markUnderReview = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { notes } = req.body;
    const adminId = req.userId;

    const verification = await SupplierVerification.getById(id);

    if (!verification) {
        throw new AppError('Verification request not found', 404, ERROR_CODES.NOT_FOUND);
    }

    const updatedProfile = await SupplierVerification.updateStatus(
        id,
        'under_review',
        notes || 'Verification is now under review',
        adminId
    );

    res.json({
        success: true,
        message: 'Marked as under review',
        data: {
            profile: updatedProfile
        }
    });
});

/**
 * @route   GET /api/admin/supplier-verifications/stats
 * @desc    Get verification statistics
 * @access  Private (Admin only)
 */
const getVerificationStats = asyncHandler(async (req, res) => {
    const stats = await SupplierVerification.getStats();

    res.json({
        success: true,
        data: {
            ...stats,
            approvalRate: stats.total_count > 0
                ? ((stats.verified_count / stats.total_count) * 100).toFixed(2)
                : 0,
            rejectionRate: stats.total_count > 0
                ? ((stats.rejected_count / stats.total_count) * 100).toFixed(2)
                : 0
        }
    });
});

/**
 * @route   GET /api/admin/supplier-verifications/all
 * @desc    Get all verifications with filter
 * @access  Private (Admin only)
 */
const getAllVerifications = asyncHandler(async (req, res) => {
    const { status, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const verifications = await SupplierVerification.getPendingVerifications(
        parseInt(limit),
        offset,
        status || null
    );

    res.json({
        success: true,
        data: {
            verifications,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: verifications.length
            }
        }
    });
});

module.exports = {
    getPendingVerifications,
    getVerificationDetails,
    approveVerification,
    rejectVerification,
    markUnderReview,
    getVerificationStats,
    getAllVerifications
};
