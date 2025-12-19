const express = require('express');
const router = express.Router();
const supplierController = require('../controllers/supplier.controller');
const { verifyToken, requireRole } = require('../middleware/auth.middleware');
const { validate } = require('../validators/auth.validator');
const {
    createListingSchema,
    updateListingSchema,
    updateOrderItemStatusSchema
} = require('../validators/supplier.validator');

// All routes require authentication and supplier role
router.use(verifyToken);
router.use(requireRole('supplier'));

// ==========================================
// LISTINGS ROUTES
// ==========================================

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

module.exports = router;
