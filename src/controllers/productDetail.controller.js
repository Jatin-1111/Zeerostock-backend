const ProductDetail = require('../models/ProductDetail');

/**
 * Product Detail Controllers
 * Handles product detail page endpoints
 */

/**
 * GET /api/products/:id
 * Main product detail endpoint
 */
const getProductDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || null;

    const product = await ProductDetail.getFullDetails(id, userId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Track view
    await ProductDetail.incrementViews(id).catch(() => { });

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('Error fetching product detail:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch product details',
      error: error.message
    });
  }
};

/**
 * GET /api/products/:id/specifications
 * Get product specifications
 */
const getSpecifications = async (req, res) => {
  try {
    const { id } = req.params;

    const specs = await ProductDetail.getSpecifications(id);

    res.json({
      success: true,
      data: { specifications: specs }
    });
  } catch (error) {
    console.error('Error fetching specifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch specifications',
      error: error.message
    });
  }
};

/**
 * GET /api/products/:id/seller
 * Get seller information
 */
const getSellerInfo = async (req, res) => {
  try {
    const { id } = req.params;

    // First get product to find seller
    const { data: product, error } = await require('../config/database').supabase
      .from('products')
      .select('supplier_id')
      .eq('id', id)
      .single();

    if (error || !product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const seller = await ProductDetail.getSellerInfo(product.supplier_id);

    res.json({
      success: true,
      data: { seller }
    });
  } catch (error) {
    console.error('Error fetching seller info:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch seller information',
      error: error.message
    });
  }
};

/**
 * GET /api/products/:id/reviews
 * Get product reviews
 */
const getReviews = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10, rating } = req.query;

    const stats = await ProductDetail.getReviewStats(id);
    const reviews = await ProductDetail.getReviews(id, parseInt(page), parseInt(limit));

    res.json({
      success: true,
      data: {
        stats,
        reviews
      }
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reviews',
      error: error.message
    });
  }
};

/**
 * GET /api/products/:id/shipping
 * Get shipping options
 */
const getShippingOptions = async (req, res) => {
  try {
    const { id } = req.params;

    const options = await ProductDetail.getShippingOptions(id);

    res.json({
      success: true,
      data: { shippingOptions: options }
    });
  } catch (error) {
    console.error('Error fetching shipping options:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch shipping options',
      error: error.message
    });
  }
};

/**
 * GET /api/products/:id/related
 * Get related products
 */
const getRelatedProducts = async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 8 } = req.query;

    const products = await ProductDetail.getRelatedProducts(id, parseInt(limit));

    res.json({
      success: true,
      data: { products }
    });
  } catch (error) {
    console.error('Error fetching related products:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch related products',
      error: error.message
    });
  }
};

/**
 * POST /api/products/:id/watch
 * Add product to watchlist
 */
const watchProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await ProductDetail.addToWatchlist(id, userId);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }

    res.json({
      success: true,
      message: 'Product added to watchlist'
    });
  } catch (error) {
    console.error('Error adding to watchlist:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add to watchlist',
      error: error.message
    });
  }
};

/**
 * DELETE /api/products/:id/watch
 * Remove product from watchlist
 */
const unwatchProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    await ProductDetail.removeFromWatchlist(id, userId);

    res.json({
      success: true,
      message: 'Product removed from watchlist'
    });
  } catch (error) {
    console.error('Error removing from watchlist:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove from watchlist',
      error: error.message
    });
  }
};

/**
 * POST /api/products/:id/request-quote
 * Request a quote for product
 */
const requestQuote = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const quoteData = {
      ...req.body,
      productId: id,
      buyerId: userId
    };

    const quote = await ProductDetail.createQuoteRequest(quoteData);

    res.status(201).json({
      success: true,
      message: 'Quote request submitted successfully',
      data: { quoteId: quote.id }
    });
  } catch (error) {
    console.error('Error creating quote request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit quote request',
      error: error.message
    });
  }
};

/**
 * POST /api/products/:id/share
 * Share product
 */
const shareProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || null;
    const { method } = req.body;

    const shareLink = await ProductDetail.createShareLink(id, userId, method);

    res.json({
      success: true,
      data: { shareLink }
    });
  } catch (error) {
    console.error('Error sharing product:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to share product',
      error: error.message
    });
  }
};

/**
 * GET /api/products/:id/auction
 * Get auction details (real-time)
 */
const getAuctionDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const auction = await ProductDetail.getAuctionDetails(id);

    if (!auction) {
      return res.status(404).json({
        success: false,
        message: 'No active auction for this product'
      });
    }

    res.json({
      success: true,
      data: { auction }
    });
  } catch (error) {
    console.error('Error fetching auction details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch auction details',
      error: error.message
    });
  }
};

module.exports = {
  getProductDetail,
  getSpecifications,
  getSellerInfo,
  getReviews,
  getShippingOptions,
  getRelatedProducts,
  watchProduct,
  unwatchProduct,
  requestQuote,
  shareProduct,
  getAuctionDetails
};
