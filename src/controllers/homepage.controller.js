const Category = require('../models/Category');
const Product = require('../models/Product');
const Auction = require('../models/Auction');
const HeroBanner = require('../models/HeroBanner');
const Testimonial = require('../models/Testimonial');
const CaseStudy = require('../models/CaseStudy');
const MarketStats = require('../models/MarketStats');
const { asyncHandler, AppError, ERROR_CODES } = require('../middleware/error.middleware');

/**
 * Homepage Controller
 * Handles all homepage and landing page API endpoints
 */

/**
 * @route   GET /api/homepage/hero-banners
 * @desc    Get all active hero banners for carousel
 * @access  Public
 */
const getHeroBanners = asyncHandler(async (req, res) => {
    const banners = await HeroBanner.getActive();

    res.json({
        success: true,
        message: 'Hero banners retrieved successfully',
        data: {
            banners,
            count: banners.length
        }
    });
});

/**
 * @route   GET /api/homepage/trending-categories
 * @desc    Get trending product categories
 * @access  Public
 */
const getTrendingCategories = asyncHandler(async (req, res) => {
    const { limit } = req.validatedQuery || { limit: 10 };

    const categories = await Category.getTrending(limit);

    // Format response
    const formattedCategories = categories.map(cat => ({
        categoryId: cat.id,
        name: cat.name,
        slug: cat.slug,
        image: cat.image_url,
        totalListings: cat.listing_count || 0,
        growthPercentage: parseFloat(cat.growth_percentage) || 0,
        demandScore: parseFloat(cat.demand_score) || 0,
        trendDirection: cat.trend_direction || 'stable',
        activeListings: cat.active_listings || 0
    }));

    res.json({
        success: true,
        message: 'Trending categories retrieved successfully',
        data: {
            categories: formattedCategories,
            count: formattedCategories.length
        }
    });
});

/**
 * @route   GET /api/homepage/featured-deals
 * @desc    Get featured product deals with discounts
 * @access  Public
 */
const getFeaturedDeals = asyncHandler(async (req, res) => {
    const { limit } = req.validatedQuery || { limit: 12 };

    const deals = await Product.getFeaturedDeals(limit);

    // Format response
    const formattedDeals = deals.map(deal => ({
        productId: deal.id,
        title: deal.title,
        slug: deal.slug,
        image: deal.image_url,
        discountPercent: parseFloat(deal.discount_percent) || 0,
        priceBefore: parseFloat(deal.price_before) || null,
        priceAfter: parseFloat(deal.price_after),
        city: deal.city,
        state: deal.state,
        category: {
            name: deal.category_name,
            slug: deal.category_slug
        },
        condition: deal.condition,
        quantity: deal.quantity,
        unit: deal.unit,
        views: deal.views_count || 0,
        watchers: deal.watchers_count || 0,
        timeRemaining: deal.time_remaining_seconds ? Math.max(0, Math.floor(deal.time_remaining_seconds)) : null,
        supplier: {
            name: deal.supplier_name,
            trustScore: parseFloat(deal.supplier_trust_score) || 0,
            verified: deal.supplier_verified || false
        }
    }));

    res.json({
        success: true,
        message: 'Featured deals retrieved successfully',
        data: {
            deals: formattedDeals,
            count: formattedDeals.length
        }
    });
});

/**
 * @route   GET /api/homepage/live-auctions
 * @desc    Get live auctions with real-time bidding data
 * @access  Public
 */
const getLiveAuctions = asyncHandler(async (req, res) => {
    const { limit } = req.validatedQuery || { limit: 12 };

    const auctions = await Auction.getLiveAuctions(limit);

    // Format response
    const formattedAuctions = auctions.map(auction => ({
        auctionId: auction.auction_id,
        productId: auction.product_id,
        productName: auction.product_name,
        productSlug: auction.product_slug,
        productImage: auction.product_image,
        currentBid: parseFloat(auction.current_bid) || parseFloat(auction.starting_bid),
        startingBid: parseFloat(auction.starting_bid),
        reservePrice: auction.reserve_price ? parseFloat(auction.reserve_price) : null,
        totalBids: auction.total_bids || 0,
        totalBidders: auction.total_bidders || 0,
        timeRemaining: auction.time_remaining_seconds ? Math.max(0, Math.floor(auction.time_remaining_seconds)) : 0,
        endTime: auction.end_time,
        condition: auction.condition,
        city: auction.city,
        category: {
            name: auction.category_name,
            slug: auction.category_slug
        },
        supplier: {
            name: auction.supplier_name,
            trustScore: parseFloat(auction.supplier_trust_score) || 0,
            verified: auction.supplier_verified || false
        }
    }));

    res.json({
        success: true,
        message: 'Live auctions retrieved successfully',
        data: {
            auctions: formattedAuctions,
            count: formattedAuctions.length
        }
    });
});

/**
 * @route   GET /api/homepage/trending-products
 * @desc    Get trending products based on views and engagement
 * @access  Public
 */
const getTrendingProducts = asyncHandler(async (req, res) => {
    const { limit } = req.validatedQuery || { limit: 12 };

    const products = await Product.getTrending(limit);

    // Format response
    const formattedProducts = products.map(product => ({
        productId: product.id,
        title: product.title,
        slug: product.slug,
        image: product.image_url,
        price: parseFloat(product.price),
        discountPercent: parseFloat(product.discount_percent) || 0,
        category: {
            name: product.category_name,
            slug: product.category_slug
        },
        city: product.city,
        condition: product.condition,
        views: product.views_count || 0,
        watchers: product.watchers_count || 0,
        timeLeft: product.time_remaining_seconds ? Math.max(0, Math.floor(product.time_remaining_seconds)) : null
    }));

    res.json({
        success: true,
        message: 'Trending products retrieved successfully',
        data: {
            products: formattedProducts,
            count: formattedProducts.length
        }
    });
});

/**
 * @route   GET /api/homepage/market-insights
 * @desc    Get real-time market analytics and trends
 * @access  Public
 */
const getMarketInsights = asyncHandler(async (req, res) => {
    const insights = await MarketStats.getMarketInsights();

    // Get top trending categories
    const topCategories = await Category.getTopByDemand(5);

    // Format top categories
    const formattedTopCategories = topCategories.map(cat => ({
        categoryId: cat.id,
        name: cat.name,
        slug: cat.slug,
        image: cat.image_url,
        demandScore: parseFloat(cat.demand_score) || 0,
        trendDirection: cat.trend_direction || 'stable',
        activeListings: cat.active_listings || 0,
        totalViews: cat.total_views || 0,
        totalInquiries: cat.total_inquiries || 0
    }));

    res.json({
        success: true,
        message: 'Market insights retrieved successfully',
        data: {
            activeListings: insights?.active_listings || 0,
            liveAuctions: insights?.live_auctions || 0,
            volumeToday: parseFloat(insights?.volume_today) || 0,
            transactionsToday: insights?.transactions_today || 0,
            marketHeatIndex: parseFloat(insights?.market_heat_index) || 50,
            demandSupplyRatio: parseFloat(insights?.demand_supply_ratio) || 1.0,
            newListingsToday: insights?.new_listings_today || 0,
            newSignupsToday: insights?.new_signups_today || 0,
            topCategories: formattedTopCategories
        }
    });
});

/**
 * @route   GET /api/homepage/case-studies
 * @desc    Get business success stories and case studies
 * @access  Public
 */
const getCaseStudies = asyncHandler(async (req, res) => {
    const { limit, featured } = req.validatedQuery || { limit: 12 };

    let caseStudies;
    if (featured === true) {
        caseStudies = await CaseStudy.getFeatured(limit);
    } else {
        caseStudies = await CaseStudy.getActive(limit);
    }

    // Format response
    const formattedCaseStudies = caseStudies.map(cs => ({
        id: cs.id,
        companyName: cs.company_name,
        industry: cs.industry,
        title: cs.title,
        summary: cs.summary,
        amountRecovered: cs.amount_recovered ? parseFloat(cs.amount_recovered) : null,
        amountSaved: cs.amount_saved ? parseFloat(cs.amount_saved) : null,
        savingsPercent: cs.savings_percent ? parseFloat(cs.savings_percent) : null,
        roiPercent: cs.roi_percent ? parseFloat(cs.roi_percent) : null,
        successHighlights: cs.success_highlights || [],
        image: cs.featured_image_url,
        fullCaseStudyURL: cs.full_case_study_url,
        videoURL: cs.video_url,
        isFeatured: cs.is_featured || false,
        publishedDate: cs.published_date,
        tags: cs.tags || []
    }));

    res.json({
        success: true,
        message: 'Case studies retrieved successfully',
        data: {
            caseStudies: formattedCaseStudies,
            count: formattedCaseStudies.length
        }
    });
});

/**
 * @route   GET /api/homepage/testimonials
 * @desc    Get customer testimonials and reviews
 * @access  Public
 */
const getTestimonials = asyncHandler(async (req, res) => {
    const { limit, featured } = req.validatedQuery || { limit: 12 };

    let testimonials;
    if (featured === true) {
        testimonials = await Testimonial.getFeatured(limit);
    } else {
        testimonials = await Testimonial.getActive(limit);
    }

    // Format response
    const formattedTestimonials = testimonials.map(test => ({
        id: test.id,
        name: test.name,
        designation: test.designation,
        company: test.company,
        rating: parseFloat(test.rating) || 5,
        quote: test.quote,
        profileImage: test.profile_image_url,
        companyLogo: test.company_logo_url,
        industry: test.industry,
        dealSize: test.deal_size,
        isFeatured: test.is_featured || false,
        verified: test.is_verified || false
    }));

    res.json({
        success: true,
        message: 'Testimonials retrieved successfully',
        data: {
            testimonials: formattedTestimonials,
            count: formattedTestimonials.length
        }
    });
});

/**
 * @route   GET /api/homepage/quick-stats
 * @desc    Get homepage quick statistics (users, volume, success rate)
 * @access  Public
 */
const getQuickStats = asyncHandler(async (req, res) => {
    const stats = await MarketStats.getQuickStats();

    res.json({
        success: true,
        message: 'Quick stats retrieved successfully',
        data: {
            totalUsers: stats?.total_users || 0,
            formattedUsers: formatLargeNumber(stats?.total_users || 0),
            transactionVolume: parseFloat(stats?.total_transaction_volume) || 0,
            formattedVolume: `$${formatLargeNumber(parseFloat(stats?.total_transaction_volume) || 0)}`,
            successRate: parseFloat(stats?.success_rate) || 0,
            formattedSuccessRate: `${parseFloat(stats?.success_rate) || 0}%`,
            activeListings: stats?.active_listings || 0,
            liveAuctions: stats?.live_auctions || 0,
            volumeToday: parseFloat(stats?.volume_today) || 0,
            totalCategories: stats?.total_categories || 0,
            verifiedSuppliers: stats?.verified_suppliers || 0,
            averageRating: parseFloat(stats?.average_rating) || 0
        }
    });
});

/**
 * @route   GET /api/homepage
 * @desc    Get complete homepage data in one optimized request
 * @access  Public
 */
const getCompleteHomepage = asyncHandler(async (req, res) => {
    const { sections, compact } = req.validatedQuery || {};

    // Determine which sections to include
    const requestedSections = sections ? sections.split(',') : [
        'hero_banners',
        'trending_categories',
        'featured_deals',
        'live_auctions',
        'trending_products',
        'market_insights',
        'case_studies',
        'testimonials',
        'quick_stats'
    ];

    // Fetch all data in parallel for performance
    const dataPromises = {};

    if (requestedSections.includes('hero_banners')) {
        dataPromises.heroBanners = HeroBanner.getActive();
    }

    if (requestedSections.includes('trending_categories')) {
        dataPromises.trendingCategories = Category.getTrending(compact ? 6 : 10);
    }

    if (requestedSections.includes('featured_deals')) {
        dataPromises.featuredDeals = Product.getFeaturedDeals(compact ? 6 : 12);
    }

    if (requestedSections.includes('live_auctions')) {
        dataPromises.liveAuctions = Auction.getLiveAuctions(compact ? 6 : 12);
    }

    if (requestedSections.includes('trending_products')) {
        dataPromises.trendingProducts = Product.getTrending(compact ? 6 : 12);
    }

    if (requestedSections.includes('market_insights')) {
        dataPromises.marketInsights = MarketStats.getMarketInsights();
        dataPromises.topCategories = Category.getTopByDemand(5);
    }

    if (requestedSections.includes('case_studies')) {
        dataPromises.caseStudies = CaseStudy.getFeatured(compact ? 3 : 6);
    }

    if (requestedSections.includes('testimonials')) {
        dataPromises.testimonials = Testimonial.getFeatured(compact ? 6 : 12);
    }

    if (requestedSections.includes('quick_stats')) {
        dataPromises.quickStats = MarketStats.getQuickStats();
    }

    // Resolve all promises
    const results = await Promise.all(
        Object.entries(dataPromises).map(async ([key, promise]) => {
            try {
                const data = await promise;
                return [key, data];
            } catch (error) {
                console.error(`Error fetching ${key}:`, error);
                return [key, null];
            }
        })
    );

    // Convert array to object
    const data = Object.fromEntries(results);

    // Format response
    const response = {
        success: true,
        message: 'Homepage data retrieved successfully',
        data: {}
    };

    if (data.heroBanners) {
        response.data.heroBanners = data.heroBanners;
    }

    if (data.trendingCategories) {
        response.data.trendingCategories = data.trendingCategories.map(cat => ({
            categoryId: cat.id,
            name: cat.name,
            slug: cat.slug,
            image: cat.image_url,
            totalListings: cat.listing_count || 0,
            growthPercentage: parseFloat(cat.growth_percentage) || 0
        }));
    }

    if (data.featuredDeals) {
        response.data.featuredDeals = data.featuredDeals.map(deal => ({
            productId: deal.id,
            title: deal.title,
            slug: deal.slug,
            image: deal.image_url,
            discountPercent: parseFloat(deal.discount_percent) || 0,
            priceBefore: parseFloat(deal.price_before) || null,
            priceAfter: parseFloat(deal.price_after),
            city: deal.city,
            supplierTrustScore: parseFloat(deal.supplier_trust_score) || 0,
            views: deal.views_count || 0,
            timeRemaining: deal.time_remaining_seconds ? Math.max(0, Math.floor(deal.time_remaining_seconds)) : null
        }));
    }

    if (data.liveAuctions) {
        response.data.liveAuctions = data.liveAuctions.map(auction => ({
            auctionId: auction.auction_id,
            productName: auction.product_name,
            productImage: auction.product_image,
            currentBid: parseFloat(auction.current_bid) || parseFloat(auction.starting_bid),
            totalBids: auction.total_bids || 0,
            timeRemaining: auction.time_remaining_seconds ? Math.max(0, Math.floor(auction.time_remaining_seconds)) : 0,
            supplierVerified: auction.supplier_verified || false
        }));
    }

    if (data.trendingProducts) {
        response.data.trendingProducts = data.trendingProducts.map(product => ({
            productId: product.id,
            title: product.title,
            image: product.image_url,
            price: parseFloat(product.price),
            category: product.category_name,
            views: product.views_count || 0,
            watchers: product.watchers_count || 0
        }));
    }

    if (data.marketInsights && data.topCategories) {
        response.data.marketInsights = {
            activeListings: data.marketInsights?.active_listings || 0,
            liveAuctions: data.marketInsights?.live_auctions || 0,
            volumeToday: parseFloat(data.marketInsights?.volume_today) || 0,
            marketHeatIndex: parseFloat(data.marketInsights?.market_heat_index) || 50,
            topCategories: data.topCategories.map(cat => ({
                name: cat.name,
                demandScore: parseFloat(cat.demand_score) || 0,
                trendDirection: cat.trend_direction
            }))
        };
    }

    if (data.caseStudies) {
        response.data.caseStudies = data.caseStudies.map(cs => ({
            companyName: cs.company_name,
            industry: cs.industry,
            amountRecovered: cs.amount_recovered ? parseFloat(cs.amount_recovered) : null,
            savingsPercent: cs.savings_percent ? parseFloat(cs.savings_percent) : null,
            successHighlights: cs.success_highlights || [],
            image: cs.featured_image_url
        }));
    }

    if (data.testimonials) {
        response.data.testimonials = data.testimonials.map(test => ({
            name: test.name,
            designation: test.designation,
            company: test.company,
            rating: parseFloat(test.rating) || 5,
            quote: test.quote,
            profileImage: test.profile_image_url
        }));
    }

    if (data.quickStats) {
        response.data.quickStats = {
            totalUsers: `${formatLargeNumber(data.quickStats?.total_users || 0)}+`,
            transactionVolume: `$${formatLargeNumber(parseFloat(data.quickStats?.total_transaction_volume) || 0)}+`,
            successRate: `${parseFloat(data.quickStats?.success_rate) || 0}%`
        };
    }

    res.json(response);
});

/**
 * Helper function to format large numbers
 * @param {number} num
 * @returns {string}
 */
function formatLargeNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

module.exports = {
    getHeroBanners,
    getTrendingCategories,
    getFeaturedDeals,
    getLiveAuctions,
    getTrendingProducts,
    getMarketInsights,
    getCaseStudies,
    getTestimonials,
    getQuickStats,
    getCompleteHomepage
};
