const RecentlyViewed = require('../models/RecentlyViewed');

/**
 * Recently Viewed Controllers
 * Handles recently viewed products tracking
 */

/**
 * GET /api/buyer/recently-viewed
 * Get buyer's recently viewed products
 */
const getRecentlyViewed = async (req, res) => {
    try {
        const userId = req.user.id;
        const { page, limit } = req.query;

        const result = await RecentlyViewed.getByUserId(userId, { page, limit });

        // Format the response
        const formattedItems = result.items.map(item => {
            const images = item.products.gallery_images || [];
            const imageUrl = item.products.image_url;
            const allImages = imageUrl ? [imageUrl, ...images] : images;

            return {
                viewId: item.id,
                productId: item.products.id,
                title: item.products.title,
                slug: item.products.slug,
                image: imageUrl || allImages[0] || null,
                images: allImages,

                // Pricing
                originalPrice: item.products.price_before,
                currentPrice: item.products.price_after,
                discountPercent: item.products.discount_percent,

                // Location
                city: item.products.city,
                state: item.products.state,

                // Product details
                condition: item.products.condition,
                listingType: item.products.listing_type,
                status: item.products.status,
                availableQuantity: item.products.quantity,

                // Auction details (if applicable)
                expiresAt: item.products.expires_at,

                // View tracking
                viewCount: item.view_count,
                lastViewedAt: item.last_viewed_at,
                firstViewedAt: item.created_at
            };
        });

        res.json({
            success: true,
            message: 'Recently viewed products retrieved successfully',
            data: {
                items: formattedItems,
                pagination: result.pagination
            }
        });

    } catch (error) {
        console.error('Error getting recently viewed:', error);
        console.error('Error details:', error.message);
        console.error('Error code:', error.code);
        res.status(500).json({
            success: false,
            errorCode: 'SERVER_ERROR',
            message: 'Failed to retrieve recently viewed products',
            ...(process.env.NODE_ENV === 'development' && { error: error.message })
        });
    }
};

/**
 * POST /api/buyer/recently-viewed/add
 * Add product to recently viewed
 */
const addRecentlyViewed = async (req, res) => {
    try {
        const userId = req.user.id;
        const { productId } = req.body;

        const viewRecord = await RecentlyViewed.addOrUpdate(userId, productId);

        res.json({
            success: true,
            message: 'Product view tracked',
            data: {
                viewId: viewRecord.id,
                productId: viewRecord.product_id,
                viewCount: viewRecord.view_count,
                lastViewedAt: viewRecord.last_viewed_at
            }
        });

    } catch (error) {
        console.error('Error tracking recently viewed:', error);
        res.status(500).json({
            success: false,
            errorCode: 'SERVER_ERROR',
            message: 'Failed to track product view'
        });
    }
};

/**
 * DELETE /api/buyer/recently-viewed/clear
 * Clear all recently viewed products
 */
const clearRecentlyViewed = async (req, res) => {
    try {
        const userId = req.user.id;

        await RecentlyViewed.clearAll(userId);

        res.json({
            success: true,
            message: 'Recently viewed history cleared'
        });

    } catch (error) {
        console.error('Error clearing recently viewed:', error);
        res.status(500).json({
            success: false,
            errorCode: 'SERVER_ERROR',
            message: 'Failed to clear recently viewed history'
        });
    }
};

/**
 * DELETE /api/buyer/recently-viewed/:productId
 * Remove specific product from recently viewed
 */
const removeRecentlyViewed = async (req, res) => {
    try {
        const userId = req.user.id;
        const { productId } = req.params;

        await RecentlyViewed.remove(userId, productId);

        res.json({
            success: true,
            message: 'Product removed from recently viewed'
        });

    } catch (error) {
        console.error('Error removing from recently viewed:', error);
        res.status(500).json({
            success: false,
            errorCode: 'SERVER_ERROR',
            message: 'Failed to remove product from recently viewed'
        });
    }
};

/**
 * GET /api/buyer/recently-viewed/count
 * Get recently viewed count
 */
const getRecentlyViewedCount = async (req, res) => {
    try {
        const userId = req.user.id;

        const count = await RecentlyViewed.getCount(userId);

        res.json({
            success: true,
            data: { count }
        });

    } catch (error) {
        console.error('Error getting recently viewed count:', error);
        res.status(500).json({
            success: false,
            errorCode: 'SERVER_ERROR',
            message: 'Failed to get recently viewed count'
        });
    }
};

module.exports = {
    getRecentlyViewed,
    addRecentlyViewed,
    clearRecentlyViewed,
    removeRecentlyViewed,
    getRecentlyViewedCount
};
