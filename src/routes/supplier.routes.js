const express = require('express');
const router = express.Router();
const supplierController = require('../controllers/supplier.controller');
const imageUploadController = require('../controllers/imageUpload.controller');
const { verifyToken, requireRole } = require('../middleware/auth.middleware');
const { validate } = require('../validators/auth.validator');
const {
    createListingSchema,
    updateListingSchema,
    updateOrderItemStatusSchema
} = require('../validators/supplier.validator');
const { imageUploadConfig } = require('../middleware/upload.middleware');

// All routes require authentication and supplier role
router.use(verifyToken);
router.use(requireRole('supplier'));

// ==========================================
// PROFILE ROUTE
// ==========================================

/**
 * @route   GET /api/supplier/profile
 * @desc    Get supplier profile with company info and business metrics
 * @access  Private (Supplier)
 */
router.get('/profile', supplierController.getProfile);

// ==========================================
// LISTINGS ROUTES
// ==========================================

/**
 * @route   POST /api/supplier/listings/upload-images
 * @desc    Upload product images to S3
 * @access  Private (Supplier)
 */
router.post(
    '/listings/upload-images',
    imageUploadConfig.array('images', 10),
    imageUploadController.uploadImages
);

/**
 * @route   DELETE /api/supplier/listings/delete-image
 * @desc    Delete product image from S3
 * @access  Private (Supplier)
 */
router.delete(
    '/listings/delete-image',
    imageUploadController.deleteImage
);

/**
 * @route   GET /api/supplier/listings
 * @desc    Get all listings for the authenticated supplier
 * @access  Private (Supplier)
 */
router.get('/listings', supplierController.getMyListings);

/**
 * @route   GET /api/supplier/listings/:id
 * @desc    Get a specific listing by ID
 * @access  Private (Supplier)
 */
router.get('/listings/:id', supplierController.getListingById);

/**
 * @route   POST /api/supplier/listings
 * @desc    Create a new listing
 * @access  Private (Supplier)
 */
router.post(
    '/listings',
    validate(createListingSchema),
    supplierController.createListing
);

/**
 * @route   PUT /api/supplier/listings/:id
 * @desc    Update a listing
 * @access  Private (Supplier)
 */
router.put(
    '/listings/:id',
    validate(updateListingSchema),
    supplierController.updateListing
);

/**
 * @route   DELETE /api/supplier/listings/:id
 * @desc    Delete a listing
 * @access  Private (Supplier)
 */
router.delete('/listings/:id', supplierController.deleteListing);

// ==========================================
// DASHBOARD ROUTES
// ==========================================

/**
 * @route   GET /api/supplier/dashboard/stats
 * @desc    Get supplier dashboard statistics
 * @access  Private (Supplier)
 */
router.get('/dashboard/stats', supplierController.getDashboardStats);

/**
 * @route   GET /api/supplier/analytics
 * @desc    Get supplier analytics and performance metrics
 * @access  Private (Supplier)
 */
router.get('/analytics', supplierController.getAnalytics);

// ==========================================
// ORDERS ROUTES
// ==========================================

/**
 * @route   GET /api/supplier/orders
 * @desc    Get all orders for the supplier
 * @access  Private (Supplier)
 */
router.get('/orders', supplierController.getSupplierOrders);

/**
 * @route   PUT /api/supplier/orders/:orderId/items/:itemId/status
 * @desc    Update order item status
 * @access  Private (Supplier)
 */
router.put(
    '/orders/:orderId/items/:itemId/status',
    validate(updateOrderItemStatusSchema),
    supplierController.updateOrderItemStatus
);

// ==========================================
// PAYMENTS & INVOICES ROUTES
// ==========================================

/**
 * @route   GET /api/supplier/payments
 * @desc    Get all payment transactions for the supplier
 * @access  Private (Supplier)
 */
router.get('/payments', supplierController.getPayments);

/**
 * @route   GET /api/supplier/invoices
 * @desc    Get all invoices for the supplier
 * @access  Private (Supplier)
 */
router.get('/invoices', supplierController.getInvoices);

// ==========================================
// PAYMENT METHODS ROUTES
// ==========================================

const paymentMethodsController = require('../controllers/paymentMethods.controller');
const { addPaymentMethodSchema } = require('../validators/paymentMethods.validator');

/**
 * @route   GET /api/supplier/payment-methods
 * @desc    Get all payment methods for the supplier
 * @access  Private (Supplier)
 */
router.get('/payment-methods', paymentMethodsController.getPaymentMethods);

/**
 * @route   POST /api/supplier/payment-methods
 * @desc    Add a new payment method
 * @access  Private (Supplier)
 */
router.post(
    '/payment-methods',
    validate(addPaymentMethodSchema),
    paymentMethodsController.addPaymentMethod
);

/**
 * @route   PUT /api/supplier/payment-methods/:id/set-primary
 * @desc    Set a payment method as primary
 * @access  Private (Supplier)
 */
router.put('/payment-methods/:id/set-primary', paymentMethodsController.setPrimaryPaymentMethod);

/**
 * @route   DELETE /api/supplier/payment-methods/:id
 * @desc    Delete a payment method
 * @access  Private (Supplier)
 */
router.delete('/payment-methods/:id', paymentMethodsController.deletePaymentMethod);

/**
 * @route   POST /api/supplier/payment-methods/:id/verify
 * @desc    Verify a payment method
 * @access  Private (Supplier)
 */
router.post('/payment-methods/:id/verify', paymentMethodsController.verifyPaymentMethod);

// ==========================================
// RFQ ROUTES
// ==========================================

/**
 * @route   GET /api/supplier/rfqs
 * @desc    Get all RFQ opportunities for the supplier
 * @access  Private (Supplier)
 */
router.get('/rfqs', supplierController.getRFQs);

/**
 * @route   GET /api/supplier/rfqs/:id
 * @desc    Get RFQ details by ID
 * @access  Private (Supplier)
 */
router.get('/rfqs/:id', supplierController.getRFQById);

/**
 * @route   POST /api/supplier/rfqs/:id/quotes
 * @desc    Submit a quote for an RFQ
 * @access  Private (Supplier)
 */
router.post('/rfqs/:id/quotes', supplierController.submitQuote);

// ==========================================
// QUOTES ROUTES
// ==========================================

/**
 * @route   GET /api/supplier/quotes
 * @desc    Get all quotes submitted by the supplier
 * @access  Private (Supplier)
 */
router.get('/quotes', supplierController.getQuotes);

module.exports = router;
