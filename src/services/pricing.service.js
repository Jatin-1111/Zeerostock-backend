const { supabase } = require('../config/database');
const Coupon = require('../models/Coupon');

/**
 * Pricing Service
 * Handles all pricing calculations including discounts, GST, shipping, and platform fees
 */
class PricingService {
    /**
     * Calculate complete cart summary with all charges
     * @param {Array} cartItems - Cart items array
     * @param {string} couponCode - Applied coupon code
     * @param {string} userId - User ID
     * @param {Object} shippingInfo - Shipping details {city, pincode, state}
     * @returns {Promise<Object>} - Complete pricing summary
     */
    static async calculateCartSummary(cartItems, couponCode = null, userId = null, shippingInfo = null) {
        try {
            if (!cartItems || cartItems.length === 0) {
                return this.getEmptySummary();
            }

            // Calculate item subtotal (after item-level discounts)
            let itemSubtotal = 0;
            let totalDiscount = 0;
            let itemsBreakdown = [];

            for (const item of cartItems) {
                const price = item.price || item.originalPrice || 0;
                const discountPercent = item.discountPercent || 0;

                const itemTotal = price * item.quantity;
                const itemDiscount = (itemTotal * discountPercent) / 100;
                const itemSubtotalAfterDiscount = itemTotal - itemDiscount;

                itemSubtotal += itemSubtotalAfterDiscount;
                totalDiscount += itemDiscount;

                itemsBreakdown.push({
                    itemId: item.itemId,
                    productId: item.productId,
                    title: item.title,
                    quantity: item.quantity,
                    unitPrice: price,
                    discount: itemDiscount,
                    subtotal: itemSubtotalAfterDiscount
                });
            }

            // Calculate coupon discount
            let couponDiscount = 0;
            let couponDetails = null;

            if (couponCode && itemSubtotal > 0) {
                const couponResult = await Coupon.validateAndCalculate(
                    couponCode,
                    userId,
                    itemSubtotal,
                    cartItems
                );

                if (couponResult.valid) {
                    couponDiscount = couponResult.discountAmount;
                    couponDetails = couponResult.coupon;
                }
            }

            // Calculate subtotal after coupon
            const subtotalAfterCoupon = Math.max(0, itemSubtotal - couponDiscount);

            // Calculate GST (on subtotal after all discounts)
            const gstAmount = this.calculateGST(cartItems, subtotalAfterCoupon);

            // Calculate shipping charges
            const shippingCharges = await this.calculateShipping(
                cartItems,
                subtotalAfterCoupon,
                shippingInfo
            );

            // Calculate platform fee (if applicable)
            const platformFee = this.calculatePlatformFee(subtotalAfterCoupon);

            // Calculate final payable amount
            const finalPayableAmount = Math.round(
                (subtotalAfterCoupon + gstAmount + shippingCharges + platformFee) * 100
            ) / 100;

            return {
                itemSubtotal: Math.round(itemSubtotal * 100) / 100,
                discountAmount: Math.round(totalDiscount * 100) / 100,
                couponDiscount: Math.round(couponDiscount * 100) / 100,
                couponDetails,
                subtotalAfterDiscounts: Math.round(subtotalAfterCoupon * 100) / 100,
                gstAmount: Math.round(gstAmount * 100) / 100,
                shippingCharges: Math.round(shippingCharges * 100) / 100,
                platformFee: Math.round(platformFee * 100) / 100,
                finalPayableAmount,
                itemsBreakdown,
                totalSavings: Math.round((totalDiscount + couponDiscount) * 100) / 100
            };

        } catch (error) {
            console.error('Error calculating cart summary:', error);
            throw error;
        }
    }

    /**
     * Calculate GST amount
     * GST is calculated on the subtotal after all discounts
     * @param {Array} cartItems - Cart items
     * @param {number} subtotalAfterDiscounts - Subtotal after discounts
     * @returns {number} - GST amount
     */
    static calculateGST(cartItems, subtotalAfterDiscounts) {
        // For simplicity, applying weighted average GST
        // In real scenario, GST should be calculated per item and summed

        if (!cartItems || cartItems.length === 0) {
            return 0;
        }

        // Calculate weighted average GST percentage
        let totalWeight = 0;
        let weightedGst = 0;

        for (const item of cartItems) {
            const itemPrice = (item.price || item.originalPrice || 0) * item.quantity;
            const gstPercent = item.gstPercent || 18; // Default 18% GST

            totalWeight += itemPrice;
            weightedGst += (itemPrice * gstPercent);
        }

        const avgGstPercent = totalWeight > 0 ? weightedGst / totalWeight : 18;

        // Apply GST on subtotal after discounts
        const gstAmount = (subtotalAfterDiscounts * avgGstPercent) / 100;

        return gstAmount;
    }

    /**
     * Calculate shipping charges based on location and order value
     * @param {Array} cartItems - Cart items
     * @param {number} subtotal - Order subtotal
     * @param {Object} shippingInfo - Shipping information
     * @returns {Promise<number>} - Shipping charges
     */
    static async calculateShipping(cartItems, subtotal, shippingInfo = null) {
        try {
            // If no shipping info provided, return default estimate
            if (!shippingInfo || !shippingInfo.state) {
                return 500; // Default shipping charge
            }

            // Get shipping zone for the state
            const { data: zone, error } = await supabase
                .from('shipping_zones')
                .select('*')
                .eq('is_active', true)
                .contains('states', [shippingInfo.state])
                .single();

            if (error || !zone) {
                // If zone not found, use default
                return 500;
            }

            // Check if eligible for free shipping
            if (zone.free_shipping_threshold && subtotal >= zone.free_shipping_threshold) {
                return 0;
            }

            // Calculate weight-based shipping (if applicable)
            // For now, using base charge
            let shippingCharge = zone.base_charge;

            // Apply per-kg charge if items have weight
            // This would require weight data in products
            // For now, keeping it simple with base charge

            return shippingCharge;

        } catch (error) {
            console.error('Error calculating shipping:', error);
            return 500; // Fallback to default
        }
    }

    /**
     * Calculate platform fee (if applicable)
     * @param {number} subtotal - Order subtotal
     * @returns {number} - Platform fee
     */
    static calculatePlatformFee(subtotal) {
        // Platform fee logic - currently 0 for B2B
        // Can be configured based on business model
        // Example: 2% for orders below certain threshold

        // For now, no platform fee
        return 0;
    }

    /**
     * Estimate shipping charges for a location
     * @param {string} state - State name
     * @param {string} city - City name
     * @param {string} pincode - Pincode
     * @param {number} orderValue - Estimated order value
     * @returns {Promise<Object>} - Shipping estimate
     */
    static async estimateShipping(state, city = null, pincode = null, orderValue = 0) {
        try {
            // Get shipping zone
            const { data: zone, error } = await supabase
                .from('shipping_zones')
                .select('*')
                .eq('is_active', true)
                .contains('states', [state])
                .single();

            if (error || !zone) {
                return {
                    available: false,
                    message: 'Shipping not available for this location',
                    charges: null
                };
            }

            // Check free shipping eligibility
            const isFreeShipping = zone.free_shipping_threshold &&
                orderValue >= zone.free_shipping_threshold;

            return {
                available: true,
                zone: zone.zone_name,
                baseCharges: zone.base_charge,
                charges: isFreeShipping ? 0 : zone.base_charge,
                isFreeShipping,
                freeShippingThreshold: zone.free_shipping_threshold,
                estimatedDelivery: {
                    minDays: zone.estimated_days_min,
                    maxDays: zone.estimated_days_max,
                    message: `Delivery in ${zone.estimated_days_min}-${zone.estimated_days_max} business days`
                }
            };

        } catch (error) {
            console.error('Error estimating shipping:', error);
            return {
                available: false,
                message: 'Unable to estimate shipping at this time',
                charges: null
            };
        }
    }

    /**
     * Validate stock availability for all cart items
     * @param {Array} cartItems - Cart items
     * @returns {Promise<Object>} - Validation result
     */
    static async validateStock(cartItems) {
        try {
            const validationResults = [];
            let allAvailable = true;

            for (const item of cartItems) {
                // Get current product details
                const { data: product, error } = await supabase
                    .from('products')
                    .select('id, title, quantity, status, price_after, discount_percent')
                    .eq('id', item.productId)
                    .single();

                if (error || !product) {
                    validationResults.push({
                        itemId: item.itemId,
                        productId: item.productId,
                        available: false,
                        reason: 'PRODUCT_NOT_FOUND',
                        message: 'Product no longer available'
                    });
                    allAvailable = false;
                    continue;
                }

                // Check status
                if (product.status !== 'active') {
                    validationResults.push({
                        itemId: item.itemId,
                        productId: item.productId,
                        available: false,
                        reason: 'PRODUCT_INACTIVE',
                        message: 'Product is no longer active'
                    });
                    allAvailable = false;
                    continue;
                }

                // Check stock
                if (product.quantity < item.quantity) {
                    validationResults.push({
                        itemId: item.itemId,
                        productId: item.productId,
                        available: false,
                        reason: 'INSUFFICIENT_STOCK',
                        message: `Only ${product.quantity} units available`,
                        requestedQuantity: item.quantity,
                        availableQuantity: product.quantity
                    });
                    allAvailable = false;
                    continue;
                }

                // Check price changes
                const priceChanged = product.price_after !== item.originalPrice;
                const oldPrice = item.originalPrice;
                const newPrice = product.price_after;
                const priceDiff = newPrice - oldPrice;
                const priceChangePercent = oldPrice > 0 ? ((priceDiff / oldPrice) * 100).toFixed(2) : 0;

                validationResults.push({
                    itemId: item.itemId,
                    productId: item.productId,
                    available: true,
                    stockAvailable: product.quantity,
                    priceChanged,
                    priceDetails: priceChanged ? {
                        oldPrice,
                        newPrice,
                        difference: priceDiff,
                        changePercent: priceChangePercent
                    } : null
                });
            }

            return {
                valid: allAvailable,
                items: validationResults,
                summary: {
                    totalItems: cartItems.length,
                    availableItems: validationResults.filter(r => r.available).length,
                    unavailableItems: validationResults.filter(r => !r.available).length,
                    priceChangedItems: validationResults.filter(r => r.priceChanged).length
                }
            };

        } catch (error) {
            console.error('Error validating stock:', error);
            throw error;
        }
    }

    /**
     * Get empty summary
     */
    static getEmptySummary() {
        return {
            itemSubtotal: 0,
            discountAmount: 0,
            couponDiscount: 0,
            couponDetails: null,
            subtotalAfterDiscounts: 0,
            gstAmount: 0,
            shippingCharges: 0,
            platformFee: 0,
            finalPayableAmount: 0,
            itemsBreakdown: [],
            totalSavings: 0
        };
    }

    /**
     * Calculate savings breakdown
     * @param {Object} summary - Pricing summary
     * @returns {Object} - Savings details
     */
    static calculateSavings(summary) {
        return {
            itemDiscounts: summary.discountAmount,
            couponDiscount: summary.couponDiscount,
            totalSavings: summary.totalSavings,
            savingsPercent: summary.itemSubtotal > 0
                ? ((summary.totalSavings / summary.itemSubtotal) * 100).toFixed(2)
                : 0
        };
    }
}

module.exports = PricingService;
