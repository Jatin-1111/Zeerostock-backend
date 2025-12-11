const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');

// Controllers
const marketplaceController = require('../controllers/marketplace.controller');

// Validators
const { marketplaceValidation, validateQuery } = require('../validators/marketplace.validator');

// Rate limiter for marketplace APIs (relaxed for public access)
const marketplaceLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again after a minute',
        errorCode: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Apply rate limiting to all marketplace routes
router.use(marketplaceLimiter);

/**
 * @route   GET /api/marketplace/products
 * @desc    Get all marketplace products with advanced filters and sorting
 * @access  Public
 * @params  Query Parameters:
 *          - page (number): Page number for pagination (default: 1)
 *          - limit (number): Number of products per page (default: 20, max: 100)
 *          - categoryId (uuid): Filter by category
 *          - industryId (uuid): Filter by industry
 *          - minPrice (number): Minimum price filter
 *          - maxPrice (number): Maximum price filter
 *          - condition (string|array): Product condition (new, like-new, good, fair)
 *          - listingType (string|array): Listing type (auction, fixed, negotiable)
 *          - verified (boolean): Filter verified suppliers only
 *          - city (string): Filter by city
 *          - minDiscount (number): Minimum discount percentage
 *          - maxDiscount (number): Maximum discount percentage
 *          - q (string): Search query
 *          - sort (string): Sort order (relevance, price-asc, price-desc, newest, views, ending-soon, rating, discount)
 */
router.get(
    '/products',
    validateQuery(marketplaceValidation.products),
    marketplaceController.getProducts
);

/**
 * @route   GET /api/marketplace/categories
 * @desc    Get all active categories with product counts
 * @access  Public
 * @params  Query Parameters:
 *          - limit (number): Number of categories to return
 *          - industryId (uuid): Filter categories by industry
 *          - includeCount (boolean): Include product counts (default: true)
 */
router.get(
    '/categories',
    validateQuery(marketplaceValidation.categories),
    marketplaceController.getCategories
);

/**
 * @route   GET /api/marketplace/industries
 * @desc    Get all active industries with product counts
 * @access  Public
 * @params  Query Parameters:
 *          - limit (number): Number of industries to return
 *          - includeCount (boolean): Include product counts (default: true)
 */
router.get(
    '/industries',
    validateQuery(marketplaceValidation.industries),
    marketplaceController.getIndustries
);

/**
 * @route   GET /api/marketplace/featured-deals
 * @desc    Get today's featured deals (high discount products)
 * @access  Public
 * @params  Query Parameters:
 *          - limit (number): Number of deals to return (default: 12, max: 50)
 */
router.get(
    '/featured-deals',
    validateQuery(marketplaceValidation.featuredDeals),
    marketplaceController.getFeaturedDeals
);

/**
 * @route   GET /api/marketplace/sponsored
 * @desc    Get sponsored listings (advertised products)
 * @access  Public
 * @params  Query Parameters:
 *          - limit (number): Number of sponsored listings (default: 10, max: 20)
 */
router.get(
    '/sponsored',
    validateQuery(marketplaceValidation.sponsored),
    marketplaceController.getSponsored
);

/**
 * @route   GET /api/marketplace/trending
 * @desc    Get trending products based on views and engagement
 * @access  Public
 * @params  Query Parameters:
 *          - limit (number): Number of trending products (default: 20, max: 50)
 */
router.get(
    '/trending',
    validateQuery(marketplaceValidation.trending),
    marketplaceController.getTrending
);

/**
 * @route   GET /api/marketplace/filters
 * @desc    Get all available filter options with counts
 * @access  Public
 * @returns All filter metadata including:
 *          - categories (with counts)
 *          - industries (with counts)
 *          - cities
 *          - conditions
 *          - listing types
 *          - price ranges
 *          - discount ranges
 *          - sort options
 */
router.get(
    '/filters',
    validateQuery(marketplaceValidation.filters),
    marketplaceController.getFilters
);

module.exports = router;
