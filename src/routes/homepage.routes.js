const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');

// Controllers
const homepageController = require('../controllers/homepage.controller');

// Validators
const { homepageValidation, validateQuery } = require('../validators/homepage.validator');

// Rate limiter for homepage APIs (relaxed for public access)
const homepageLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 60, // 60 requests per minute
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again after a minute',
        errorCode: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Apply rate limiting to all homepage routes
router.use(homepageLimiter);

/**
 * @route   GET /api/homepage/hero-banners
 * @desc    Get active hero banners for homepage carousel
 * @access  Public
 */
router.get(
    '/hero-banners',
    homepageController.getHeroBanners
);

/**
 * @route   GET /api/homepage/trending-categories
 * @desc    Get trending product categories with growth metrics
 * @access  Public
 */
router.get(
    '/trending-categories',
    validateQuery(homepageValidation.trendingCategories),
    homepageController.getTrendingCategories
);

/**
 * @route   GET /api/homepage/featured-deals
 * @desc    Get featured product deals with highest discounts
 * @access  Public
 */
router.get(
    '/featured-deals',
    validateQuery(homepageValidation.featuredDeals),
    homepageController.getFeaturedDeals
);

/**
 * @route   GET /api/homepage/live-auctions
 * @desc    Get live auctions with real-time bidding data
 * @access  Public
 */
router.get(
    '/live-auctions',
    validateQuery(homepageValidation.liveAuctions),
    homepageController.getLiveAuctions
);

/**
 * @route   GET /api/homepage/trending-products
 * @desc    Get trending products based on views and engagement
 * @access  Public
 */
router.get(
    '/trending-products',
    validateQuery(homepageValidation.trendingProducts),
    homepageController.getTrendingProducts
);

/**
 * @route   GET /api/homepage/market-insights
 * @desc    Get real-time market analytics and category trends
 * @access  Public
 */
router.get(
    '/market-insights',
    validateQuery(homepageValidation.marketInsights),
    homepageController.getMarketInsights
);

/**
 * @route   GET /api/homepage/case-studies
 * @desc    Get business success stories and case studies
 * @access  Public
 */
router.get(
    '/case-studies',
    validateQuery(homepageValidation.caseStudies),
    homepageController.getCaseStudies
);

/**
 * @route   GET /api/homepage/testimonials
 * @desc    Get customer testimonials and reviews
 * @access  Public
 */
router.get(
    '/testimonials',
    validateQuery(homepageValidation.testimonials),
    homepageController.getTestimonials
);

/**
 * @route   GET /api/homepage/quick-stats
 * @desc    Get homepage quick statistics (users, volume, success rate)
 * @access  Public
 */
router.get(
    '/quick-stats',
    homepageController.getQuickStats
);

/**
 * @route   GET /api/homepage
 * @desc    Get complete homepage data (combined endpoint for optimal performance)
 * @access  Public
 */
router.get(
    '/',
    validateQuery(homepageValidation.combined),
    homepageController.getCompleteHomepage
);

module.exports = router;
