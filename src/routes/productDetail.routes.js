const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const productDetailController = require('../controllers/productDetail.controller');
const productDetailValidator = require('../validators/productDetail.validator');
const { verifyToken, optionalAuth } = require('../middleware/auth.middleware');

// Quote rate limiter - 10 quotes per hour
const quoteRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: {
    success: false,
    message: 'Too many quote requests, please try again after an hour'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Product Detail Routes
 * Base path: /api/products
 */

// GET /api/products/:id - Main product detail
router.get(
  '/:id',
  productDetailValidator.validateProductId,
  optionalAuth,
  productDetailController.getProductDetail
);

// GET /api/products/:id/specifications - Product specifications
router.get(
  '/:id/specifications',
  productDetailValidator.validateProductId,
  productDetailController.getSpecifications
);

// GET /api/products/:id/seller - Seller information
router.get(
  '/:id/seller',
  productDetailValidator.validateProductId,
  productDetailController.getSellerInfo
);

// GET /api/products/:id/reviews - Product reviews
router.get(
  '/:id/reviews',
  productDetailValidator.validateProductId,
  productDetailValidator.validateReviewsQuery,
  productDetailController.getReviews
);

// GET /api/products/:id/shipping - Shipping options
router.get(
  '/:id/shipping',
  productDetailValidator.validateProductId,
  productDetailController.getShippingOptions
);

// GET /api/products/:id/related - Related products
router.get(
  '/:id/related',
  productDetailValidator.validateProductId,
  productDetailValidator.validateRelatedQuery,
  productDetailController.getRelatedProducts
);

// POST /api/products/:id/watch - Add to watchlist (Auth required)
router.post(
  '/:id/watch',
  verifyToken,
  productDetailValidator.validateProductId,
  productDetailController.watchProduct
);

// DELETE /api/products/:id/watch - Remove from watchlist (Auth required)
router.delete(
  '/:id/watch',
  verifyToken,
  productDetailValidator.validateProductId,
  productDetailController.unwatchProduct
);

// POST /api/products/:id/request-quote - Request quote (Auth required, Rate limited)
router.post(
  '/:id/request-quote',
  verifyToken,
  quoteRateLimiter,
  productDetailValidator.validateProductId,
  productDetailValidator.validateQuoteRequest,
  productDetailController.requestQuote
);

// POST /api/products/:id/share - Share product (Optional auth)
router.post(
  '/:id/share',
  optionalAuth,
  productDetailValidator.validateProductId,
  productDetailValidator.validateShare,
  productDetailController.shareProduct
);

// GET /api/products/:id/auction - Auction details
router.get(
  '/:id/auction',
  productDetailValidator.validateProductId,
  productDetailController.getAuctionDetails
);

module.exports = router;
