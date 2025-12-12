const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');

// Import controllers
const {
  getSuggestions,
  searchProducts,
  searchCategories,
  getDidYouMean,
  getPopularSearches,
  getRecentSearches,
  trackSearch
} = require('../controllers/search.controller');

// Import validators
const {
  validateSuggestionsQuery,
  validateProductsSearch,
  validateCategoriesSearch,
  validateDidYouMean,
  validatePopularSearches,
  validateRecentSearches,
  validateTrackSearch
} = require('../validators/search.validator');

// Import auth middleware
const { verifyToken, optionalAuth } = require('../middleware/auth.middleware');

// Rate limiting for search endpoints (higher limit for better UX)
const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: {
    success: false,
    message: 'Too many search requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiting for analytics (higher limit)
const analyticsLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 200, // 200 requests per minute
  message: {
    success: false,
    message: 'Too many analytics requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * @route   GET /api/search/suggestions
 * @desc    Get auto-suggestions for search query
 * @access  Public
 */
router.get(
  '/suggestions',
  searchLimiter,
  validateSuggestionsQuery,
  getSuggestions
);

/**
 * @route   GET /api/search/products
 * @desc    Search products with filters and sorting
 * @access  Public (optionalAuth to save recent searches if logged in)
 */
router.get(
  '/products',
  searchLimiter,
  optionalAuth,
  validateProductsSearch,
  searchProducts
);

/**
 * @route   GET /api/search/categories
 * @desc    Search categories by name
 * @access  Public
 */
router.get(
  '/categories',
  searchLimiter,
  validateCategoriesSearch,
  searchCategories
);

/**
 * @route   GET /api/search/did-you-mean
 * @desc    Get spell correction suggestions
 * @access  Public
 */
router.get(
  '/did-you-mean',
  searchLimiter,
  validateDidYouMean,
  getDidYouMean
);

/**
 * @route   GET /api/search/popular
 * @desc    Get popular search terms
 * @access  Public
 */
router.get(
  '/popular',
  searchLimiter,
  validatePopularSearches,
  getPopularSearches
);

/**
 * @route   GET /api/search/recent
 * @desc    Get user's recent search history
 * @access  Private (requires authentication)
 */
router.get(
  '/recent',
  searchLimiter,
  verifyToken,
  validateRecentSearches,
  getRecentSearches
);

/**
 * @route   POST /api/search/track
 * @desc    Track search analytics event
 * @access  Public (optionalAuth for user tracking)
 */
router.post(
  '/track',
  analyticsLimiter,
  optionalAuth,
  validateTrackSearch,
  trackSearch
);

module.exports = router;
