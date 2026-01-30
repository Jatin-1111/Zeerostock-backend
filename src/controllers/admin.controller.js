const SupplierVerification = require('../models/SupplierVerification');
const User = require('../models/User');
const Order = require('../models/Order');
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

    if (verification.verification_status === 'approved' || verification.verification_status === 'verified') {
        throw new AppError('This supplier is already verified', 400, 'ALREADY_VERIFIED');
    }

    // Update status to verified
    const updatedProfile = await SupplierVerification.updateStatus(
        id,
        'verified',
        adminId,
        notes || 'Supplier verification approved by admin'
    );

    // Add supplier role to user_roles table (or activate if exists)
    const UserRole = require('../models/UserRole');
    await UserRole.upsert(verification.userId, 'supplier', {
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
        adminId,
        reason
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
        adminId,
        notes || 'Verification is now under review'
    );

    // Send supplier under review notification email (non-blocking)
    try {
        const supplier = await User.findById(verification.supplier_id);
        if (supplier && supplier.business_email) {
            await emailService.sendSupplierUnderReview(supplier.business_email || supplier.email, {
                fullName: `${supplier.first_name} ${supplier.last_name}`,
                businessName: supplier.company_name
            });
        }
    } catch (emailError) {
        console.error('Error sending under review email:', emailError);
        // Don't fail the request if email fails
    }

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

/**
 * ORDER MANAGEMENT
 */

/**
 * @route   GET /api/admin/orders/stats
 * @desc    Get order statistics for admin dashboard
 * @access  Private (Admin only)
 */
const getOrderStats = asyncHandler(async (req, res) => {
    const stats = await Order.getAdminStats();

    res.json({
        success: true,
        data: stats
    });
});

/**
 * @route   GET /api/admin/orders
 * @desc    Get all orders with filters
 * @access  Private (Admin only)
 */
const getAllOrders = asyncHandler(async (req, res) => {
    const { page = 1, limit = 50, status, search, sortBy = 'created_at', sortOrder = 'desc' } = req.query;

    const result = await Order.getAllOrdersAdmin({
        page: parseInt(page),
        limit: parseInt(limit),
        status,
        search,
        sortBy,
        sortOrder
    });

    res.json({
        success: true,
        data: result
    });
});

/**
 * @route   GET /api/admin/orders/:orderId
 * @desc    Get specific order details
 * @access  Private (Admin only)
 */
const getOrderDetails = asyncHandler(async (req, res) => {
    const { orderId } = req.params;

    const order = await Order.getOrderByIdAdmin(orderId);

    if (!order) {
        throw new AppError('Order not found', 404, ERROR_CODES.NOT_FOUND);
    }

    // Format the response similar to buyer endpoint
    const formattedOrder = {
        orderId: order.id,
        orderNumber: order.order_number,
        status: order.status,
        paymentStatus: order.payment_status,

        // Items
        items: order.order_items?.map(item => ({
            itemId: item.id,
            productId: item.product_id,
            productTitle: item.product_title,
            productImage: item.product_image,
            productSku: item.product_sku,
            quantity: item.quantity,
            unitPrice: item.unit_price,
            discount: item.discount_amount,
            finalPrice: item.final_price,
            subtotal: item.subtotal,
            itemStatus: item.item_status,
            supplier: {
                id: item.supplier_id,
                name: item.supplier_name,
                city: item.supplier_city
            }
        })) || [],

        // Pricing
        pricing: {
            itemsSubtotal: order.items_subtotal,
            discountAmount: order.discount_amount,
            couponDiscount: order.coupon_discount,
            couponCode: order.coupon_code,
            gstAmount: order.gst_amount,
            shippingCharges: order.shipping_charges,
            platformFee: order.platform_fee,
            totalAmount: order.total_amount
        },

        // Shipping
        shippingAddress: order.shipping_address,
        billingAddress: order.billing_address,
        deliveryEta: order.delivery_eta,
        shippingPartner: order.shipping_partner,
        trackingNumber: order.tracking_number,

        // Payment
        paymentMethod: order.payment_method,
        paymentTransactionId: order.payment_transaction_id,
        paymentDate: order.payment_date,

        // Documents
        invoiceUrl: order.invoice_url,
        invoiceNumber: order.invoice_number,

        // Tracking
        tracking: order.order_tracking?.map(track => ({
            status: track.status,
            title: track.title,
            description: track.description,
            location: track.location,
            isMilestone: track.is_milestone,
            timestamp: track.created_at
        })) || [],

        // Timestamps
        createdAt: order.created_at,
        updatedAt: order.updated_at,
        completedAt: order.completed_at,
        userId: order.user_id
    };

    res.json({
        success: true,
        data: formattedOrder
    });
});

/**
 * @route   PUT /api/admin/orders/:orderId/status
 * @desc    Update order status
 * @access  Private (Admin only)
 */
const updateOrderStatus = asyncHandler(async (req, res) => {
    const { orderId } = req.params;
    const { status, notes } = req.body;

    // Validate status
    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'in_transit', 'delivered', 'cancelled', 'issue'];
    if (!validStatuses.includes(status)) {
        throw new AppError('Invalid status', 400, ERROR_CODES.VALIDATION_ERROR);
    }

    const updatedOrder = await Order.updateOrderStatus(orderId, status, notes);

    res.json({
        success: true,
        message: 'Order status updated successfully',
        data: {
            orderId: updatedOrder.id,
            orderNumber: updatedOrder.order_number,
            status: updatedOrder.status
        }
    });
});

/**
 * @route   GET /api/admin/verification-document
 * @desc    Proxy to fetch verification document from AWS S3
 * @access  Private (Admin only)
 */
const getVerificationDocument = asyncHandler(async (req, res) => {
    const { url } = req.query;

    if (!url) {
        throw new AppError('Document URL is required', 400, 'VALIDATION_ERROR');
    }

    try {
        const axios = require('axios');
        const s3Service = require('../services/s3.service');

        console.log('📄 Fetching document from:', url);

        let documentUrl = url;

        // Check if this is an S3 URL
        if (url.includes('s3.amazonaws.com') || url.includes('.s3.')) {
            console.log('🔍 Detected S3 URL');

            // Extract file key from S3 URL
            const fileKey = s3Service.extractFileKeyFromUrl(url);

            if (!fileKey) {
                console.error('❌ Failed to extract file key from URL');
                throw new AppError('Invalid S3 URL format', 400, 'INVALID_URL');
            }

            console.log('🔑 Extracted file key:', fileKey);
            console.log('🔧 Generating fresh presigned URL...');

            try {
                // Generate a new presigned URL valid for 1 hour
                const presignedResult = await s3Service.getPresignedUrl(fileKey, 3600);
                documentUrl = presignedResult.url;
                console.log('✅ Generated presigned URL successfully');
            } catch (s3Error) {
                console.error('❌ S3 presigned URL generation failed:', s3Error.message);
                console.error('S3 Error details:', s3Error);
                throw new AppError(`Failed to generate presigned URL: ${s3Error.message}`, 500, 'S3_ERROR');
            }
        } else if (url.includes('cloudinary.com')) {
            // Legacy Cloudinary support (for old documents)
            const { cloudinary } = require('../utils/cloudinary');

            console.log('☁️ Processing legacy Cloudinary document');

            const urlParts = url.split('/upload/');
            if (urlParts.length < 2) {
                throw new AppError('Invalid Cloudinary URL format', 400, 'INVALID_URL');
            }

            let publicIdWithVersion = urlParts[1];

            try {
                documentUrl = cloudinary.url(publicIdWithVersion, {
                    sign_url: true,
                    type: 'upload',
                    resource_type: 'auto'
                });
                console.log('✅ Generated signed URL for legacy Cloudinary resource');
            } catch (signError) {
                console.log('⚠️ Could not generate signed URL, using original URL:', signError.message);
                documentUrl = url;
            }
        }

        console.log('📡 Fetching document from URL...');

        // Fetch the document
        const response = await axios({
            method: 'GET',
            url: documentUrl,
            responseType: 'stream',
            timeout: 30000
        });

        console.log('✅ Document fetched successfully, content-type:', response.headers['content-type']);

        // Set appropriate headers
        res.setHeader('Content-Type', response.headers['content-type'] || 'application/pdf');
        res.setHeader('Content-Disposition', 'inline');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cache-Control', 'public, max-age=3600');

        // Pipe the response directly
        response.data.pipe(res);
    } catch (error) {
        console.error('❌ Error fetching document:', error.message);
        console.error('Error stack:', error.stack);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }

        // Don't throw if headers already sent
        if (!res.headersSent) {
            throw new AppError(
                error.message || 'Failed to retrieve document',
                error.statusCode || 500,
                error.errorCode || 'DOCUMENT_RETRIEVAL_ERROR'
            );
        }
    }
});

module.exports = {
    getPendingVerifications,
    getVerificationDetails,
    approveVerification,
    rejectVerification,
    markUnderReview,
    getVerificationStats,
    getAllVerifications,
    // Order management
    getOrderStats,
    getAllOrders,
    getOrderDetails,
    updateOrderStatus,
    // Document management
    getVerificationDocument
};