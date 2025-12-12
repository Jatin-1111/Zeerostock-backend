const Cart = require('../models/Cart');
const Coupon = require('../models/Coupon');
const PricingService = require('../services/pricing.service');

/**
 * Cart Controllers
 * Handles all cart operations for B2B marketplace
 */

/**
 * POST /api/cart/add
 * Add item to cart
 */
const addToCart = async (req, res) => {
    try {
        const { productId, quantity = 1 } = req.body;
        const userId = req.user?.id || null;
        const sessionToken = req.cookies?.cart_session || req.headers['x-cart-session'];

        const cartItem = await Cart.addItem({
            userId,
            sessionToken,
            productId,
            quantity
        });

        // If guest cart and new session, set cookie
        if (!userId && cartItem._sessionToken && !req.cookies?.cart_session) {
            res.cookie('cart_session', cartItem._sessionToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
            });
        }

        res.status(201).json({
            success: true,
            message: 'Item added to cart',
            data: {
                cartItemId: cartItem.id,
                quantity: cartItem.quantity,
                sessionToken: cartItem._sessionToken || undefined
            }
        });

    } catch (error) {
        console.error('Error adding to cart:', error);

        // Handle specific error cases
        const errorMessages = {
            'PRODUCT_NOT_FOUND': 'Product not found',
            'PRODUCT_NOT_AVAILABLE': 'Product is not available',
            'AUCTION_ITEM_NOT_ALLOWED_IN_CART': 'Auction items cannot be added to cart. Please bid on the auction page.',
            'NOT_ENOUGH_STOCK': 'Insufficient stock available',
            'USER_OR_SESSION_REQUIRED': 'Invalid cart session'
        };

        const message = errorMessages[error.message] || 'Failed to add item to cart';
        const statusCode = error.message === 'PRODUCT_NOT_FOUND' ? 404 : 400;

        res.status(statusCode).json({
            success: false,
            message,
            error: error.message
        });
    }
};

/**
 * GET /api/cart
 * Get full cart with pricing summary
 */
const getCart = async (req, res) => {
    try {
        const userId = req.user?.id || null;
        const sessionToken = req.cookies?.cart_session || req.headers['x-cart-session'];

        // Get cart items
        const cartData = await Cart.getCart(userId, sessionToken);

        if (!cartData.items || cartData.items.length === 0) {
            return res.json({
                success: true,
                data: {
                    items: [],
                    summary: PricingService.getEmptySummary(),
                    itemCount: 0
                }
            });
        }

        // Calculate pricing summary
        const shippingInfo = {
            state: req.query.state || null,
            city: req.query.city || null,
            pincode: req.query.pincode || null
        };

        const summary = await PricingService.calculateCartSummary(
            cartData.items,
            cartData.coupon?.code,
            userId,
            shippingInfo
        );

        // Check for any issues with items
        const hasIssues = cartData.items.some(item =>
            !item.availability.isAvailable ||
            item.availability.priceChanged ||
            item.availability.stockChanged
        );

        res.json({
            success: true,
            data: {
                items: cartData.items,
                summary,
                coupon: cartData.coupon,
                itemCount: cartData.items.length,
                hasIssues,
                warnings: hasIssues ? this.generateWarnings(cartData.items) : []
            }
        });

    } catch (error) {
        console.error('Error fetching cart:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch cart',
            error: error.message
        });
    }
};

/**
 * PUT /api/cart/update/:itemId
 * Update cart item quantity
 */
const updateCartItem = async (req, res) => {
    try {
        const { itemId } = req.params;
        const { quantity } = req.body;
        const userId = req.user?.id || null;

        if (!quantity || quantity < 1) {
            return res.status(400).json({
                success: false,
                message: 'Invalid quantity'
            });
        }

        const updatedItem = await Cart.updateItemQuantity(itemId, quantity, userId);

        res.json({
            success: true,
            message: 'Cart item updated',
            data: updatedItem
        });

    } catch (error) {
        console.error('Error updating cart item:', error);

        const errorMessages = {
            'CART_ITEM_NOT_FOUND': 'Cart item not found',
            'NOT_ENOUGH_STOCK': 'Insufficient stock available',
            'INVALID_QUANTITY': 'Invalid quantity',
            'UNAUTHORIZED': 'Unauthorized to update this item'
        };

        const message = errorMessages[error.message] || 'Failed to update cart item';
        const statusCode = error.message === 'CART_ITEM_NOT_FOUND' ? 404 :
            error.message === 'UNAUTHORIZED' ? 403 : 400;

        res.status(statusCode).json({
            success: false,
            message,
            error: error.message
        });
    }
};

/**
 * DELETE /api/cart/remove/:itemId
 * Remove item from cart
 */
const removeFromCart = async (req, res) => {
    try {
        const { itemId } = req.params;
        const userId = req.user?.id || null;

        await Cart.removeItem(itemId, userId);

        res.json({
            success: true,
            message: 'Item removed from cart'
        });

    } catch (error) {
        console.error('Error removing from cart:', error);

        const errorMessages = {
            'CART_ITEM_NOT_FOUND': 'Cart item not found',
            'UNAUTHORIZED': 'Unauthorized to remove this item'
        };

        const message = errorMessages[error.message] || 'Failed to remove item from cart';
        const statusCode = error.message === 'CART_ITEM_NOT_FOUND' ? 404 :
            error.message === 'UNAUTHORIZED' ? 403 : 500;

        res.status(statusCode).json({
            success: false,
            message,
            error: error.message
        });
    }
};

/**
 * DELETE /api/cart/clear
 * Clear entire cart
 */
const clearCart = async (req, res) => {
    try {
        const userId = req.user?.id || null;
        const sessionToken = req.cookies?.cart_session || req.headers['x-cart-session'];

        await Cart.clearCart(userId, sessionToken);

        res.json({
            success: true,
            message: 'Cart cleared successfully'
        });

    } catch (error) {
        console.error('Error clearing cart:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to clear cart',
            error: error.message
        });
    }
};

/**
 * POST /api/cart/apply-coupon
 * Apply coupon to cart
 */
const applyCoupon = async (req, res) => {
    try {
        const { couponCode } = req.body;
        const userId = req.user?.id || null;
        const sessionToken = req.cookies?.cart_session || req.headers['x-cart-session'];

        if (!couponCode) {
            return res.status(400).json({
                success: false,
                message: 'Coupon code is required'
            });
        }

        // Get cart items
        const cartData = await Cart.getCart(userId, sessionToken);

        if (!cartData.items || cartData.items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Cart is empty',
                error: 'CART_EMPTY'
            });
        }

        // Calculate cart subtotal
        const itemSubtotal = cartData.items.reduce((sum, item) => {
            const price = item.price || 0;
            const discount = (price * (item.discountPercent || 0)) / 100;
            return sum + ((price - discount) * item.quantity);
        }, 0);

        // Validate coupon
        const couponResult = await Coupon.validateAndCalculate(
            couponCode,
            userId,
            itemSubtotal,
            cartData.items
        );

        if (!couponResult.valid) {
            return res.status(400).json({
                success: false,
                message: couponResult.message,
                error: couponResult.error
            });
        }

        // Apply coupon to cart
        await Cart.applyCoupon(couponCode, userId, sessionToken);

        res.json({
            success: true,
            message: couponResult.message,
            data: {
                coupon: couponResult.coupon,
                discountAmount: couponResult.discountAmount
            }
        });

    } catch (error) {
        console.error('Error applying coupon:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to apply coupon',
            error: error.message
        });
    }
};

/**
 * POST /api/cart/remove-coupon
 * Remove applied coupon
 */
const removeCoupon = async (req, res) => {
    try {
        const userId = req.user?.id || null;
        const sessionToken = req.cookies?.cart_session || req.headers['x-cart-session'];

        await Cart.removeCoupon(userId, sessionToken);

        res.json({
            success: true,
            message: 'Coupon removed successfully'
        });

    } catch (error) {
        console.error('Error removing coupon:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to remove coupon',
            error: error.message
        });
    }
};

/**
 * GET /api/cart/validate
 * Validate cart items (stock, prices, availability)
 */
const validateCart = async (req, res) => {
    try {
        const userId = req.user?.id || null;
        const sessionToken = req.cookies?.cart_session || req.headers['x-cart-session'];

        // Get cart items
        const cartData = await Cart.getCart(userId, sessionToken);

        if (!cartData.items || cartData.items.length === 0) {
            return res.json({
                success: true,
                data: {
                    valid: true,
                    items: [],
                    summary: { totalItems: 0, availableItems: 0, unavailableItems: 0 }
                }
            });
        }

        // Validate stock
        const validation = await PricingService.validateStock(cartData.items);

        res.json({
            success: true,
            data: validation
        });

    } catch (error) {
        console.error('Error validating cart:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to validate cart',
            error: error.message
        });
    }
};

/**
 * GET /api/cart/shipping-estimate
 * Estimate shipping charges
 */
const estimateShipping = async (req, res) => {
    try {
        const { state, city, pincode, orderValue } = req.query;

        if (!state) {
            return res.status(400).json({
                success: false,
                message: 'State is required for shipping estimate'
            });
        }

        const estimate = await PricingService.estimateShipping(
            state,
            city,
            pincode,
            parseFloat(orderValue) || 0
        );

        res.json({
            success: true,
            data: estimate
        });

    } catch (error) {
        console.error('Error estimating shipping:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to estimate shipping',
            error: error.message
        });
    }
};

/**
 * POST /api/cart/checkout
 * Create checkout session (NOT order creation)
 */
const createCheckoutSession = async (req, res) => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required for checkout'
            });
        }

        const { shippingAddress } = req.body;

        // Get cart
        const cartData = await Cart.getCart(userId);

        if (!cartData.items || cartData.items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Cart is empty',
                error: 'CART_EMPTY'
            });
        }

        // Validate stock
        const validation = await PricingService.validateStock(cartData.items);

        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                message: 'Some items in your cart are not available',
                error: 'CART_VALIDATION_FAILED',
                data: validation
            });
        }

        // Check for negotiable items
        const hasNegotiableItems = cartData.items.some(item => item.listingType === 'rfq');

        if (hasNegotiableItems) {
            return res.status(400).json({
                success: false,
                message: 'Cart contains negotiable items. Please finalize prices before checkout.',
                error: 'NEGOTIATION_REQUIRED'
            });
        }

        // Calculate final pricing
        const shippingInfo = shippingAddress ? {
            state: shippingAddress.state,
            city: shippingAddress.city,
            pincode: shippingAddress.pincode
        } : null;

        const summary = await PricingService.calculateCartSummary(
            cartData.items,
            cartData.coupon?.code,
            userId,
            shippingInfo
        );

        // Create checkout session
        const { supabase } = require('../config/database');
        const crypto = require('crypto');
        const sessionToken = crypto.randomBytes(32).toString('hex');

        const { data: checkoutSession, error } = await supabase
            .from('checkout_sessions')
            .insert({
                session_token: sessionToken,
                user_id: userId,
                cart_snapshot: JSON.stringify({
                    items: cartData.items,
                    coupon: cartData.coupon
                }),
                item_subtotal: summary.itemSubtotal,
                discount_amount: summary.discountAmount,
                coupon_discount: summary.couponDiscount,
                gst_amount: summary.gstAmount,
                shipping_charges: summary.shippingCharges,
                platform_fee: summary.platformFee,
                final_amount: summary.finalPayableAmount,
                shipping_city: shippingAddress?.city,
                shipping_pincode: shippingAddress?.pincode,
                shipping_address: shippingAddress ? JSON.stringify(shippingAddress) : null,
                coupon_code: cartData.coupon?.code,
                status: 'pending',
                expires_at: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
            })
            .select()
            .single();

        if (error) throw error;

        res.json({
            success: true,
            message: 'Checkout session created',
            data: {
                sessionToken: checkoutSession.session_token,
                sessionId: checkoutSession.id,
                summary,
                expiresAt: checkoutSession.expires_at,
                expiresIn: 1800 // 30 minutes in seconds
            }
        });

    } catch (error) {
        console.error('Error creating checkout session:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create checkout session',
            error: error.message
        });
    }
};

/**
 * POST /api/cart/merge
 * Merge guest cart into user cart after login
 */
const mergeCart = async (req, res) => {
    try {
        const userId = req.user?.id;
        const sessionToken = req.cookies?.cart_session || req.headers['x-cart-session'];

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        if (!sessionToken) {
            return res.json({
                success: true,
                message: 'No guest cart to merge'
            });
        }

        const result = await Cart.mergeGuestCart(sessionToken, userId);

        // Clear guest cart cookie
        res.clearCookie('cart_session');

        res.json({
            success: true,
            message: 'Cart merged successfully',
            data: result
        });

    } catch (error) {
        console.error('Error merging cart:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to merge cart',
            error: error.message
        });
    }
};

/**
 * GET /api/cart/count
 * Get cart item count
 */
const getCartCount = async (req, res) => {
    try {
        const userId = req.user?.id || null;
        const sessionToken = req.cookies?.cart_session || req.headers['x-cart-session'];

        const count = await Cart.getCartCount(userId, sessionToken);

        res.json({
            success: true,
            data: { count }
        });

    } catch (error) {
        console.error('Error getting cart count:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get cart count',
            error: error.message
        });
    }
};

/**
 * Helper function to generate warnings for cart issues
 */
function generateWarnings(items) {
    const warnings = [];

    items.forEach(item => {
        if (!item.availability.isAvailable) {
            warnings.push({
                itemId: item.itemId,
                type: 'unavailable',
                message: `${item.title} is no longer available`
            });
        } else if (item.availability.stockChanged) {
            warnings.push({
                itemId: item.itemId,
                type: 'stock_changed',
                message: `Only ${item.availability.currentStock} units of ${item.title} are available`
            });
        } else if (item.availability.priceChanged) {
            warnings.push({
                itemId: item.itemId,
                type: 'price_changed',
                message: `Price of ${item.title} has changed from ₹${item.originalPrice} to ₹${item.price}`
            });
        }
    });

    return warnings;
}

module.exports = {
    addToCart,
    getCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    applyCoupon,
    removeCoupon,
    validateCart,
    estimateShipping,
    createCheckoutSession,
    mergeCart,
    getCartCount
};
