const express = require('express');
const router = express.Router();
const rfqController = require('../controllers/rfq.controller');
const { verifyToken } = require('../middleware/auth.middleware');
const { requireBuyer } = require('../middleware/role.middleware');
const {
    createRFQSchema,
    updateRFQSchema,
    queryRFQsSchema,
    uuidParamSchema,
    validateBody,
    validateQuery,
    validateParams
} = require('../validators/rfq.validator');

/**
 * @route   POST /api/rfq
 * @desc    Create a new RFQ
 * @access  Private (Buyer only)
 */
router.post(
    '/',
    verifyToken,
    requireBuyer,
    validateBody(createRFQSchema),
    rfqController.createRFQ
);

/**
 * @route   GET /api/rfq
 * @desc    Get all RFQs for logged-in buyer
 * @access  Private (Buyer only)
 * @query   page, limit, status, category, industry, search, sortBy, sortOrder
 */
router.get(
    '/',
    verifyToken,
    requireBuyer,
    validateQuery(queryRFQsSchema),
    rfqController.getMyRFQs
);

/**
 * @route   GET /api/rfq/stats
 * @desc    Get RFQ statistics for dashboard
 * @access  Private (Buyer only)
 */
router.get('/stats', verifyToken, requireBuyer, rfqController.getRFQStats);

/**
 * @route   GET /api/rfq/categories
 * @desc    Get all active categories for RFQ form
 * @access  Private (Buyer only)
 */
router.get('/categories', verifyToken, requireBuyer, rfqController.getCategories);

/**
 * @route   GET /api/rfq/industries
 * @desc    Get all active industries for RFQ form
 * @access  Private (Buyer only)
 */
router.get('/industries', verifyToken, requireBuyer, rfqController.getIndustries);

/**
 * @route   GET /api/rfq/:id
 * @desc    Get a specific RFQ by ID
 * @access  Private (Buyer only)
 */
router.get(
    '/:id',
    verifyToken,
    requireBuyer,
    validateParams(uuidParamSchema),
    rfqController.getRFQById
);

/**
 * @route   PUT /api/rfq/:id
 * @desc    Update an RFQ
 * @access  Private (Buyer only)
 */
router.put(
    '/:id',
    verifyToken,
    requireBuyer,
    validateParams(uuidParamSchema),
    validateBody(updateRFQSchema),
    rfqController.updateRFQ
);

/**
 * @route   PUT /api/rfq/:id/close
 * @desc    Close an RFQ
 * @access  Private (Buyer only)
 */
router.put(
    '/:id/close',
    verifyToken,
    requireBuyer,
    validateParams(uuidParamSchema),
    rfqController.closeRFQ
);

/**
 * @route   DELETE /api/rfq/:id
 * @desc    Delete (close) an RFQ
 * @access  Private (Buyer only)
 */
router.delete(
    '/:id',
    verifyToken,
    requireBuyer,
    validateParams(uuidParamSchema),
    rfqController.deleteRFQ
);

module.exports = router;
