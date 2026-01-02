const Watchlist = require('../models/Watchlist');
const Product = require('../models/Product');
const NotificationService = require('../services/notification.service');

/**
 * Watchlist Controllers
 * Handles saved/watchlisted items operations
 */

/**
 * GET /api/buyer/watchlist
 * Get buyer's watchlist
 */
const getWatchlist = async (req, res) => {
    try {
        const userId = req.user.id;
        const { page, limit } = req.query;

        const result = await Watchlist.getByUserId(userId, { page, limit });

        // Format the response
        const formattedItems = result.items.map(item => {
            const images = item.products.gallery_images || [];
            const imageUrl = item.products.image_url;
            const allImages = imageUrl ? [imageUrl, ...images] : images;

            return {
                id: item.id,
                priceAtAdd: item.price_at_add,
                createdAt: item.created_at,
                product: {
                    id: item.products.id,
                    title: item.products.title,
                    slug: item.products.slug,
                    imageUrl: imageUrl || allImages[0] || null,
                    galleryImages: allImages,
                    priceBefore: item.products.price_before,
                    priceAfter: item.products.price_after,
                    discountPercent: item.products.discount_percent,
                    city: item.products.city,
                    state: item.products.state,
                    condition: item.products.condition,
                    listingType: item.products.listing_type,
                    status: item.products.status,
                    quantity: item.products.quantity,
                    expiresAt: item.products.expires_at
                }
            };
        });

        res.json({
            success: true,
            message: 'Watchlist retrieved successfully',
            data: {
                items: formattedItems,
                pagination: result.pagination
            }
        });

    } catch (error) {
        console.error('Error getting watchlist:', error);
        console.error('Error details:', error.message);
        console.error('Error code:', error.code);
        res.status(500).json({
            success: false,
            errorCode: 'SERVER_ERROR',
            message: 'Failed to retrieve watchlist',
            ...(process.env.NODE_ENV === 'development' && { error: error.message })
        });
    }
};

/**
 * POST /api/buyer/watchlist/add
 * Add product to watchlist
 */
const addToWatchlist = async (req, res) => {
    try {
        const userId = req.user.id;
        const { productId, notes } = req.body;

        // Check if product exists and is available
        const product = await Product.findById(productId);

        if (!product) {
            return res.status(404).json({
                success: false,
                errorCode: 'PRODUCT_NOT_FOUND',
                message: 'Product not found'
            });
        }

        if (product.status !== 'active') {
            return res.status(400).json({
                success: false,
                errorCode: 'PRODUCT_NOT_AVAILABLE',
                message: 'This product is not available'
            });
        }

        // Add to watchlist
        const watchlistItem = await Watchlist.add(
            userId,
            productId,
            product.price_after
        );

        res.status(201).json({
            success: true,
            message: 'Product added to watchlist',
            data: {
                watchlistId: watchlistItem.id,
                productId: watchlistItem.product_id,
                addedAt: watchlistItem.created_at
            }
        });

    } catch (error) {
        console.error('Error adding to watchlist:', error);
        console.error('Error details:', error.message);
        console.error('Error code:', error.code);

        if (error.message === 'PRODUCT_ALREADY_IN_WATCHLIST') {
            return res.status(400).json({
                success: false,
                errorCode: 'PRODUCT_ALREADY_IN_WATCHLIST',
                message: 'This product is already in your watchlist'
            });
        }

        res.status(500).json({
            success: false,
            errorCode: 'SERVER_ERROR',
            message: 'Failed to add product to watchlist',
            ...(process.env.NODE_ENV === 'development' && { error: error.message })
        });
    }
};

/**
 * DELETE /api/buyer/watchlist/remove/:productId
 * Remove product from watchlist
 */
const removeFromWatchlist = async (req, res) => {
    try {
        const userId = req.user.id;
        const { productId } = req.params;

        await Watchlist.remove(userId, productId);

        res.json({
            success: true,
            message: 'Product removed from watchlist'
        });

    } catch (error) {
        console.error('Error removing from watchlist:', error);
        res.status(500).json({
            success: false,
            errorCode: 'SERVER_ERROR',
            message: 'Failed to remove product from watchlist'
        });
    }
};

/**
 * GET /api/buyer/watchlist/count
 * Get watchlist count
 */
const getWatchlistCount = async (req, res) => {
    try {
        const userId = req.user.id;

        const count = await Watchlist.getCount(userId);

        res.json({
            success: true,
            data: { count }
        });

    } catch (error) {
        console.error('Error getting watchlist count:', error);
        res.status(500).json({
            success: false,
            errorCode: 'SERVER_ERROR',
            message: 'Failed to get watchlist count'
        });
    }
};

/**
 * DELETE /api/buyer/watchlist/clear-unavailable
 * Clear unavailable products from watchlist
 */
const clearUnavailableItems = async (req, res) => {
    try {
        const userId = req.user.id;

        const removedCount = await Watchlist.clearUnavailable(userId);

        res.json({
            success: true,
            message: `${removedCount} unavailable items removed from watchlist`,
            data: { removedCount }
        });

    } catch (error) {
        console.error('Error clearing unavailable items:', error);
        res.status(500).json({
            success: false,
            errorCode: 'SERVER_ERROR',
            message: 'Failed to clear unavailable items'
        });
    }
};

/**
 * Helper function to calculate time left for auction
 * @private
 */
function _calculateTimeLeft(expiresAt) {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry - now;

    if (diff <= 0) return 'Expired';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
}

module.exports = {
    getWatchlist,
    addToWatchlist,
    removeFromWatchlist,
    getWatchlistCount,
    clearUnavailableItems
};
