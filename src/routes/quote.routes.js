const express = require('express');
const router = express.Router();
const quoteController = require('../controllers/quote.controller');
const { verifyToken } = require('../middleware/auth.middleware');
const { requireBuyer } = require('../middleware/role.middleware');
const {
    acceptQuoteSchema,
    rejectQuoteSchema,
    sendMessageSchema,
    queryQuotesSchema,
    uuidParamSchema,
    validateBody,
    validateQuery,
    validateParams
} = require('../validators/quote.validator');

/**
 * @route   GET /api/quotes
 * @desc    Get all quotes for logged-in buyer
 * @access  Private (Buyer only)
 * @query   page, limit, status, rfqId, search, sortBy, sortOrder
 */
router.get(
    '/',
    verifyToken,
    requireBuyer,
    validateQuery(queryQuotesSchema),
    quoteController.getMyQuotes
);

/**
 * @route   GET /api/quotes/stats
 * @desc    Get quote statistics for dashboard
 * @access  Private (Buyer only)
 */
router.get('/stats', verifyToken, requireBuyer, quoteController.getQuoteStats);

/**
 * @route   GET /api/quotes/:id
 * @desc    Get a specific quote by ID
 * @access  Private (Buyer only)
 */
router.get(
    '/:id',
    verifyToken,
    requireBuyer,
    validateParams(uuidParamSchema),
    quoteController.getQuoteById
);

/**
 * @route   PUT /api/quotes/:id/accept
 * @desc    Accept a quote
 * @access  Private (Buyer only)
 */
router.put(
    '/:id/accept',
    verifyToken,
    requireBuyer,
    validateParams(uuidParamSchema),
    validateBody(acceptQuoteSchema),
    quoteController.acceptQuote
);

/**
 * @route   PUT /api/quotes/:id/reject
 * @desc    Reject a quote
 * @access  Private (Buyer only)
 */
router.put(
    '/:id/reject',
    verifyToken,
    requireBuyer,
    validateParams(uuidParamSchema),
    validateBody(rejectQuoteSchema),
    quoteController.rejectQuote
);

/**
 * @route   GET /api/quotes/:id/messages
 * @desc    Get all messages for a quote
 * @access  Private (Buyer only)
 */
router.get(
    '/:id/messages',
    verifyToken,
    requireBuyer,
    validateParams(uuidParamSchema),
    quoteController.getQuoteMessages
);

/**
 * @route   POST /api/quotes/:id/messages
 * @desc    Send a message about a quote
 * @access  Private (Buyer only)
 */
router.post(
    '/:id/messages',
    verifyToken,
    requireBuyer,
    validateParams(uuidParamSchema),
    validateBody(sendMessageSchema),
    quoteController.sendMessage
);

/**
 * @route   PUT /api/quotes/:id/messages/read
 * @desc    Mark all messages as read for a quote
 * @access  Private (Buyer only)
 */
router.put(
    '/:id/messages/read',
    verifyToken,
    requireBuyer,
    validateParams(uuidParamSchema),
    quoteController.markMessagesAsRead
);

module.exports = router;
