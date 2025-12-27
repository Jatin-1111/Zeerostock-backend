const SupplierVerification = require('../models/SupplierVerification');
const UserRole = require('../models/UserRole');
const s3Service = require('../services/s3.service');
const multer = require('multer');
const { AppError, asyncHandler } = require('../middleware/error.middleware');

// Configure multer for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        // Allow PDF, DOC, DOCX, JPG, JPEG, PNG
        const allowedTypes = /pdf|doc|docx|jpg|jpeg|png/;
        const extname = allowedTypes.test(file.originalname.toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (extname && mimetype) {
            return cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only PDF, DOC, DOCX, JPG, JPEG, PNG allowed'));
        }
    }
});

/**
 * @route   POST /api/supplier/verification/draft
 * @desc    Save verification draft (auto-save)
 * @access  Private
 */
const saveDraft = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { stepData, currentStep } = req.body;

    if (!stepData || !currentStep) {
        throw new AppError('Step data and current step are required', 400);
    }

    const draft = await SupplierVerification.saveDraft(userId, stepData, currentStep);

    res.json({
        success: true,
        message: 'Draft saved successfully',
        data: draft
    });
});

/**
 * @route   GET /api/supplier/verification/draft
 * @desc    Get saved draft
 * @access  Private
 */
const getDraft = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const draft = await SupplierVerification.getDraft(userId);

    res.json({
        success: true,
        data: draft
    });
});

/**
 * @route   POST /api/supplier/verification/upload
 * @desc    Upload document to AWS S3
 * @access  Private
 */
const uploadDocument = asyncHandler(async (req, res) => {
    console.log('=== UPLOAD REQUEST RECEIVED ===');
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Body keys:', Object.keys(req.body));
    console.log('Body:', JSON.stringify(req.body, null, 2));
    console.log('File:', req.file ? {
        fieldname: req.file.fieldname,
        originalname: req.file.originalname,
        encoding: req.file.encoding,
        mimetype: req.file.mimetype,
        size: req.file.size,
        buffer: req.file.buffer ? `Buffer(${req.file.buffer.length} bytes)` : 'No buffer'
    } : 'No file');
    console.log('User:', req.user ? req.user.id : 'No user');

    if (!req.file) {
        console.error('ERROR: No file in request!');
        throw new AppError('No file uploaded', 400);
    }

    const { documentType } = req.body;
    if (!documentType) {
        console.error('ERROR: No documentType in request!');
        throw new AppError('Document type is required', 400);
    }

    // Check if S3 is configured
    if (!s3Service.isConfigured()) {
        console.error('ERROR: AWS S3 is not properly configured');
        throw new AppError('File upload service is not configured', 500);
    }

    const userId = req.user.id;
    const folder = `verification-documents/${userId}/${documentType}`;

    console.log(`Uploading to S3 bucket: ${process.env.AWS_S3_BUCKET_NAME}`);
    console.log(`Folder: ${folder}`);
    console.log('S3 config:', {
        region: process.env.AWS_REGION,
        bucket: process.env.AWS_S3_BUCKET_NAME,
        has_access_key: !!process.env.AWS_ACCESS_KEY_ID,
        has_secret_key: !!process.env.AWS_SECRET_ACCESS_KEY
    });

    // Upload to S3
    const result = await s3Service.uploadFile(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        folder
    );

    console.log('Upload successful:', result.url);
    console.log('S3 file key:', result.fileKey);

    res.json({
        success: true,
        message: 'Document uploaded successfully',
        data: {
            url: result.url,
            publicId: result.fileKey, // Keep same interface as Cloudinary
            documentType
        }
    });
});

/**
 * @route   POST /api/supplier/verification/submit
 * @desc    Submit complete verification
 * @access  Private
 */
const submitVerification = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const verificationData = req.body;

    // Check if user already has a pending/approved supplier verification
    const existingVerification = await SupplierVerification.findByUserId(userId);
    if (existingVerification && existingVerification.verification_status === 'pending') {
        throw new AppError('You already have a pending verification request', 400);
    }
    if (existingVerification && existingVerification.verification_status === 'approved') {
        throw new AppError('Your supplier verification is already approved', 400);
    }

    // Check cooldown period if previously rejected
    const reapplyCheck = await UserRole.canReapplySupplier(userId);
    if (!reapplyCheck.canReapply) {
        throw new AppError(
            `You can reapply after ${reapplyCheck.daysRemaining} days`,
            403
        );
    }

    // Submit verification
    const verification = await SupplierVerification.submit(userId, verificationData);

    // Create or update supplier role (UPSERT handles race conditions)
    await UserRole.upsert(userId, 'supplier', {
        is_active: false,
        verification_status: 'pending',
        verified_at: null
    });

    // Delete draft after successful submission
    await SupplierVerification.deleteDraft(userId);

    res.json({
        success: true,
        message: 'Verification submitted successfully',
        data: verification
    });
});

/**
 * @route   GET /api/supplier/verification/status
 * @desc    Get verification status
 * @access  Private
 */
const getVerificationStatus = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    // Get verification data
    const verification = await SupplierVerification.findByUserId(userId);

    // Get role status
    const supplierRole = await UserRole.findOne(userId, 'supplier');

    // If no verification exists, check draft
    if (!verification) {
        const draft = await SupplierVerification.getDraft(userId);
        return res.json({
            success: true,
            data: {
                status: 'not_started',
                hasDraft: !!draft,
                draft: draft,
                verification: null,
                role: supplierRole
            }
        });
    }

    res.json({
        success: true,
        data: {
            status: verification.verification_status,
            verification: verification,
            role: supplierRole,
            hasDraft: false
        }
    });
});

/**
 * @route   PUT /api/admin/verification/:verificationId/approve
 * @desc    Approve supplier verification (admin only)
 * @access  Private (Admin)
 */
const approveVerification = asyncHandler(async (req, res) => {
    const { verificationId } = req.params;
    const adminId = req.user.id;

    // Update verification status
    const verification = await SupplierVerification.updateStatus(
        verificationId,
        'approved',
        adminId,
        null
    );

    if (!verification) {
        throw new AppError('Verification not found', 404);
    }

    // Activate supplier role
    await UserRole.updateStatus(verification.user_id, 'supplier', {
        is_active: true,
        verification_status: 'approved',
        verified_at: new Date()
    });

    res.json({
        success: true,
        message: 'Verification approved successfully',
        data: verification
    });
});

/**
 * @route   PUT /api/admin/verification/:verificationId/reject
 * @desc    Reject supplier verification (admin only)
 * @access  Private (Admin)
 */
const rejectVerification = asyncHandler(async (req, res) => {
    const { verificationId } = req.params;
    const { reason } = req.body;
    const adminId = req.user.id;

    if (!reason) {
        throw new AppError('Rejection reason is required', 400);
    }

    // Update verification status
    const verification = await SupplierVerification.updateStatus(
        verificationId,
        'rejected',
        adminId,
        reason
    );

    if (!verification) {
        throw new AppError('Verification not found', 404);
    }

    // Update supplier role (deactivate but keep record)
    await UserRole.updateStatus(verification.user_id, 'supplier', {
        is_active: false,
        verification_status: 'rejected',
        verified_at: null,
        rejection_reason: reason
    });

    res.json({
        success: true,
        message: 'Verification rejected',
        data: verification
    });
});

module.exports = {
    saveDraft,
    getDraft,
    uploadDocument: [upload.single('document'), uploadDocument],
    submitVerification,
    getVerificationStatus,
    approveVerification,
    rejectVerification
};
