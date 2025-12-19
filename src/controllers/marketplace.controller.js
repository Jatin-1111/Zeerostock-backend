const Marketplace = require('../models/Marketplace');
const Category = require('../models/Category');
const Industry = require('../models/Industry');
const { asyncHandler } = require('../middleware/error.middleware');

/**
 * Marketplace Controller
 * Handles all marketplace and product listing endpoints
 */

/**
 * Helper function to format time remaining
 * @param {number} seconds
 * @returns {string}
 */
const formatTimeRemaining = (seconds) => {
    if (!seconds || seconds <= 0) return null;

    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
};

/**
 * Format product for marketplace card
 * @param {Object} product
 * @returns {Object}
 */
const formatMarketplaceProduct = (product) => {
    // Extract supplier information from joined data
    const supplier = product.supplier || {};
    const supplierName = supplier.company_name ||
        (supplier.first_name ? `${supplier.first_name} ${supplier.last_name || ''}`.trim() : 'Zeerostock');

    return {
        productId: product.id,
        title: product.title,
        slug: product.slug,
        image: product.image_url,
        images: product.additional_images ? JSON.parse(product.additional_images) : [],
        price: parseFloat(product.price_after),
        originalPrice: product.price_before ? parseFloat(product.price_before) : null,
        discountPercent: parseFloat(product.discount_percent) || 0,
        condition: product.condition,
        listingType: product.listing_type,
        category: product.categories ? {
            id: product.categories.id,
            name: product.categories.name,
            slug: product.categories.slug
        } : null,
        industry: product.industries ? {
            id: product.industries.id,
            name: product.industries.name,
            slug: product.industries.slug
        } : null,
        city: product.city,
        state: product.state,
        seller: {
            id: supplier.id || product.supplier_id,
            name: supplierName,
            rating: parseFloat(product.rating) || 0,
            isVerified: supplier.is_verified || false
        },
        views: product.views_count || 0,
        watchers: product.watchers_count || 0,
        stockQuantity: product.available_quantity || 1,
        minimumOrderQuantity: product.min_order_quantity || 1,
        timeLeft: product.time_remaining_seconds || null,
        isFeatured: product.is_featured || false,
        isSponsored: product.is_sponsored || false,
        createdAt: product.listed_at || product.created_at
    };
};

/**
 * @route   GET /api/marketplace/products
 * @desc    Get all marketplace products with filters, sorting, and pagination
 * @access  Public
 */
const getProducts = asyncHandler(async (req, res) => {
    const filters = req.validatedQuery || {};

    const result = await Marketplace.getProducts(filters);

    // Format products for marketplace cards
    const formattedProducts = result.products.map(formatMarketplaceProduct);

    res.json({
        success: true,
        message: 'Products retrieved successfully',
        data: {
            products: formattedProducts,
            pagination: {
                total: result.total,
                page: result.page,
                limit: result.limit,
                totalPages: result.totalPages,
                hasNextPage: result.page < result.totalPages,
                hasPrevPage: result.page > 1
            },
            filters: {
                applied: filters,
                count: formattedProducts.length
            }
        }
    });
});

/**
 * @route   GET /api/marketplace/categories
 * @desc    Get all active categories with product counts
 * @access  Public
 */
const getCategories = asyncHandler(async (req, res) => {
    const { limit, industryId, includeCount } = req.validatedQuery || {};

    let categories;

    if (industryId) {
        // Filter categories by industry
        const { data, error } = await require('../config/database').supabase
            .from('categories')
            .select('*')
            .eq('industry_id', industryId)
            .eq('is_active', true)
            .order('product_count', { ascending: false })
            .limit(limit || 50);

        if (error) throw error;
        categories = data || [];
    } else {
        // Get all categories
        const options = { limit, includeCount };
        categories = await Category.getTrending(limit || 50);
    }

    // Format response
    const formattedCategories = categories.map(cat => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        imageUrl: cat.image_url,
        productCount: cat.product_count || 0,
        displayOrder: cat.display_order || 0,
        isTrending: cat.is_trending || false,
        isFeatured: cat.is_featured || false
    }));

    res.json({
        success: true,
        message: 'Categories retrieved successfully',
        data: {
            categories: formattedCategories,
            count: formattedCategories.length
        }
    });
});

/**
 * @route   GET /api/marketplace/industries
 * @desc    Get all active industries with product counts
 * @access  Public
 */
const getIndustries = asyncHandler(async (req, res) => {
    const { limit, includeCount } = req.validatedQuery || {};

    const options = { limit, includeCount };
    const industries = await Industry.getAll(options);

    // Format response
    const formattedIndustries = industries.map(ind => ({
        id: ind.id,
        name: ind.name,
        slug: ind.slug,
        imageUrl: ind.image_url,
        iconUrl: ind.icon_url,
        productCount: ind.product_count || 0,
        displayOrder: ind.display_order || 0
    }));

    res.json({
        success: true,
        message: 'Industries retrieved successfully',
        data: {
            industries: formattedIndustries,
            count: formattedIndustries.length
        }
    });
});

/**
 * @route   GET /api/marketplace/featured-deals
 * @desc    Get featured deals (products with high discounts)
 * @access  Public
 */
const getFeaturedDeals = asyncHandler(async (req, res) => {
    const { limit } = req.validatedQuery || { limit: 12 };

    const products = await Marketplace.getFeaturedDeals(limit);

    // Format products
    const formattedProducts = products.map(formatMarketplaceProduct);

    res.json({
        success: true,
        message: 'Featured deals retrieved successfully',
        data: {
            deals: formattedProducts,
            count: formattedProducts.length
        }
    });
});

/**
 * @route   GET /api/marketplace/sponsored
 * @desc    Get sponsored listings (ads)
 * @access  Public
 */
const getSponsored = asyncHandler(async (req, res) => {
    const { limit } = req.validatedQuery || { limit: 10 };

    const products = await Marketplace.getSponsored(limit);

    // Format products
    const formattedProducts = products.map(formatMarketplaceProduct);

    res.json({
        success: true,
        message: 'Sponsored listings retrieved successfully',
        data: {
            sponsored: formattedProducts,
            count: formattedProducts.length
        }
    });
});

/**
 * @route   GET /api/marketplace/trending
 * @desc    Get trending products based on views and engagement
 * @access  Public
 */
const getTrending = asyncHandler(async (req, res) => {
    const { limit } = req.validatedQuery || { limit: 20 };

    const products = await Marketplace.getTrending(limit);

    // Format products
    const formattedProducts = products.map(formatMarketplaceProduct);

    res.json({
        success: true,
        message: 'Trending products retrieved successfully',
        data: {
            trending: formattedProducts,
            count: formattedProducts.length
        }
    });
});

/**
 * @route   GET /api/marketplace/filters
 * @desc    Get all available filter options with counts
 * @access  Public
 */
const getFilters = asyncHandler(async (req, res) => {
    const filters = await Marketplace.getFilterOptions();
    const stats = await Marketplace.getStats();

    res.json({
        success: true,
        message: 'Filter options retrieved successfully',
        data: {
            filters,
            stats,
            sortOptions: [
                { value: 'relevance', label: 'Relevance' },
                { value: 'price-asc', label: 'Price: Low to High' },
                { value: 'price-desc', label: 'Price: High to Low' },
                { value: 'newest', label: 'Newest First' },
                { value: 'views', label: 'Most Viewed' },
                { value: 'ending-soon', label: 'Ending Soon' },
                { value: 'rating', label: 'Highest Rated' },
                { value: 'discount', label: 'Highest Discount' }
            ]
        }
    });
});

module.exports = {
    getProducts,
    getCategories,
    getIndustries,
    getFeaturedDeals,
    getSponsored,
    getTrending,
    getFilters
};
