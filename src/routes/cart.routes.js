const express = require('express');
const router = express.Router();

// Controllers
const cartController = require('../controllers/cart.controller');

// Middleware
const { verifyToken, optionalAuth } = require('../middleware/auth.middleware');
const { validate, cartValidation } = require('../validators/cart.validator');

/**
 * Cart Routes
 * Supports both guest (session-based) and authenticated users
 */

/**
 * @route   POST /api/cart/add
 * @desc    Add item to cart
 * @access  Public (guest session) / Private (logged-in)
 */
router.post(
    '/add',
    optionalAuth,
    validate(cartValidation.addToCart),
    cartController.addToCart
);

/**
 * @route   GET /api/cart
 * @desc    Get full cart with pricing summary
 * @access  Public (guest session) / Private (logged-in)
 * @query   state, city, pincode (optional for shipping calculation)
 */
router.get(
    '/',
    optionalAuth,
    cartController.getCart
);

/**
 * @route   GET /api/cart/count
 * @desc    Get cart item count
 * @access  Public (guest session) / Private (logged-in)
 */
router.get(
    '/count',
    optionalAuth,
    cartController.getCartCount
);

/**
 * @route   PUT /api/cart/update/:itemId
 * @desc    Update cart item quantity
 * @access  Public (guest session) / Private (logged-in)
 */
router.put(
    '/update/:itemId',
    optionalAuth,
    validate(cartValidation.updateCartItem),
    cartController.updateCartItem
);

/**
 * @route   DELETE /api/cart/remove/:itemId
 * @desc    Remove item from cart
 * @access  Public (guest session) / Private (logged-in)
 */
router.delete(
    '/remove/:itemId',
    optionalAuth,
    cartController.removeFromCart
);

/**
 * @route   DELETE /api/cart/clear
 * @desc    Clear entire cart
 * @access  Public (guest session) / Private (logged-in)
 */
router.delete(
    '/clear',
    optionalAuth,
    cartController.clearCart
);

/**
 * @route   POST /api/cart/apply-coupon
 * @desc    Apply coupon code to cart
 * @access  Public (guest session) / Private (logged-in)
 */
router.post(
    '/apply-coupon',
    optionalAuth,
    validate(cartValidation.applyCoupon),
    cartController.applyCoupon
);

/**
 * @route   POST /api/cart/remove-coupon
 * @desc    Remove applied coupon from cart
 * @access  Public (guest session) / Private (logged-in)
 */
router.post(
    '/remove-coupon',
    optionalAuth,
    cartController.removeCoupon
);

/**
 * @route   GET /api/cart/validate
 * @desc    Validate cart items (stock, prices, availability)
 * @access  Public (guest session) / Private (logged-in)
 */
router.get(
    '/validate',
    optionalAuth,
    cartController.validateCart
);

/**
 * @route   GET /api/cart/shipping-estimate
 * @desc    Estimate shipping charges for a location
 * @access  Public
 * @query   state (required), city, pincode, orderValue
 */
router.get(
    '/shipping-estimate',
    validate(cartValidation.shippingEstimate),
    cartController.estimateShipping
);

/**
 * @route   POST /api/cart/checkout
 * @desc    Create checkout session (requires authentication)
 * @access  Private
 */
router.post(
    '/checkout',
    verifyToken,
    validate(cartValidation.createCheckout),
    cartController.createCheckoutSession
);

/**
 * @route   POST /api/cart/merge
 * @desc    Merge guest cart into user cart after login
 * @access  Private
 */
router.post(
    '/merge',
    verifyToken,
    cartController.mergeCart
);

module.exports = router;
