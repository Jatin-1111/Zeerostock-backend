const { supabase } = require('../config/database');

/**
 * Coupon Model
 * Handles coupon validation and discount calculations
 */
class Coupon {
    /**
     * Validate and get coupon details
     * @param {string} code - Coupon code
     * @param {string} userId - User ID
     * @param {number} orderValue - Total order value
     * @param {Array} cartItems - Cart items for product/category validation
     * @returns {Promise<Object>} - Coupon details and discount amount
     */
    static async validateAndCalculate(code, userId, orderValue, cartItems = []) {
        try {
            // Get coupon
            const { data: coupon, error } = await supabase
                .from('coupons')
                .select('*')
                .eq('code', code.toUpperCase())
                .eq('is_active', true)
                .single();

            if (error || !coupon) {
                return {
                    valid: false,
                    error: 'INVALID_COUPON',
                    message: 'Invalid or expired coupon code'
                };
            }

            // Check validity period
            const now = new Date();
            const validFrom = new Date(coupon.valid_from);
            const validUntil = new Date(coupon.valid_until);

            if (now < validFrom) {
                return {
                    valid: false,
                    error: 'COUPON_NOT_STARTED',
                    message: 'This coupon is not yet active'
                };
            }

            if (now > validUntil) {
                return {
                    valid: false,
                    error: 'COUPON_EXPIRED',
                    message: 'This coupon has expired'
                };
            }

            // Check minimum order value
            if (orderValue < coupon.min_order_value) {
                return {
                    valid: false,
                    error: 'MIN_ORDER_NOT_MET',
                    message: `Minimum order value of ₹${coupon.min_order_value.toLocaleString()} required`,
                    requiredAmount: coupon.min_order_value
                };
            }

            // Check total usage limit
            if (coupon.total_usage_limit && coupon.current_usage_count >= coupon.total_usage_limit) {
                return {
                    valid: false,
                    error: 'COUPON_USAGE_LIMIT_REACHED',
                    message: 'This coupon has reached its usage limit'
                };
            }

            // Check user-specific usage
            if (userId) {
                const { count } = await supabase
                    .from('coupon_usage')
                    .select('*', { count: 'exact', head: true })
                    .eq('coupon_id', coupon.id)
                    .eq('user_id', userId);

                if (count >= coupon.max_usage_per_user) {
                    return {
                        valid: false,
                        error: 'USER_USAGE_LIMIT_REACHED',
                        message: 'You have already used this coupon maximum times'
                    };
                }
            }

            // Check product/category applicability
            if (cartItems.length > 0) {
                const applicableProducts = coupon.applicable_products || [];
                const applicableCategories = coupon.applicable_categories || [];
                const excludedProducts = coupon.excluded_products || [];

                // If specific products/categories are defined, validate
                if (applicableProducts.length > 0 || applicableCategories.length > 0) {
                    const isApplicable = cartItems.some(item => {
                        // Check if product is excluded
                        if (excludedProducts.includes(item.product_id)) {
                            return false;
                        }

                        // Check if product is in applicable list
                        if (applicableProducts.length > 0 && applicableProducts.includes(item.product_id)) {
                            return true;
                        }

                        // Check if category is in applicable list
                        if (applicableCategories.length > 0 && applicableCategories.includes(item.category_id)) {
                            return true;
                        }

                        return false;
                    });

                    if (!isApplicable) {
                        return {
                            valid: false,
                            error: 'COUPON_NOT_APPLICABLE',
                            message: 'This coupon is not applicable to items in your cart'
                        };
                    }
                }
            }

            // Calculate discount
            let discountAmount = 0;
            if (coupon.discount_type === 'percentage') {
                discountAmount = (orderValue * coupon.discount_value) / 100;
                // Apply max discount cap if defined
                if (coupon.max_discount) {
                    discountAmount = Math.min(discountAmount, coupon.max_discount);
                }
            } else if (coupon.discount_type === 'flat') {
                discountAmount = coupon.discount_value;
            }

            // Discount cannot exceed order value
            discountAmount = Math.min(discountAmount, orderValue);

            return {
                valid: true,
                coupon: {
                    id: coupon.id,
                    code: coupon.code,
                    description: coupon.description,
                    discountType: coupon.discount_type,
                    discountValue: coupon.discount_value
                },
                discountAmount: Math.round(discountAmount * 100) / 100,
                message: `Coupon applied! You saved ₹${discountAmount.toLocaleString()}`
            };

        } catch (error) {
            console.error('Error validating coupon:', error);
            return {
                valid: false,
                error: 'COUPON_VALIDATION_ERROR',
                message: 'Failed to validate coupon'
            };
        }
    }

    /**
     * Record coupon usage
     * @param {string} couponId - Coupon ID
     * @param {string} userId - User ID
     * @param {number} discountApplied - Discount amount applied
     * @param {number} orderValue - Order value
     * @param {string} orderId - Order ID (optional, added after order creation)
     */
    static async recordUsage(couponId, userId, discountApplied, orderValue, orderId = null) {
        try {
            // Insert usage record
            const { error: usageError } = await supabase
                .from('coupon_usage')
                .insert({
                    coupon_id: couponId,
                    user_id: userId,
                    order_id: orderId,
                    discount_applied: discountApplied,
                    order_value: orderValue
                });

            if (usageError) throw usageError;

            // Increment usage count
            const { error: updateError } = await supabase
                .rpc('increment_coupon_usage', { coupon_uuid: couponId });

            if (updateError) {
                console.error('Error incrementing coupon usage:', updateError);
            }

            return true;

        } catch (error) {
            console.error('Error recording coupon usage:', error);
            return false;
        }
    }

    /**
     * Get all active coupons visible to users
     * @param {string} userRole - User role ('buyer', 'supplier')
     * @returns {Promise<Array>} - List of active coupons
     */
    static async getActiveCoupons(userRole = null) {
        try {
            let query = supabase
                .from('coupons')
                .select('code, description, discount_type, discount_value, max_discount, min_order_value, valid_until')
                .eq('is_active', true)
                .eq('is_visible', true)
                .gte('valid_until', new Date().toISOString())
                .order('created_at', { ascending: false });

            // Filter by user role if specified
            if (userRole) {
                query = query.or(`user_role_restriction.is.null,user_role_restriction.eq.${userRole}`);
            } else {
                query = query.is('user_role_restriction', null);
            }

            const { data, error } = await query;

            if (error) throw error;

            return data || [];

        } catch (error) {
            console.error('Error fetching active coupons:', error);
            return [];
        }
    }

    /**
     * Check if user can use a specific coupon
     * @param {string} couponCode - Coupon code
     * @param {string} userId - User ID
     * @returns {Promise<Object>} - Eligibility status
     */
    static async checkUserEligibility(couponCode, userId) {
        try {
            const { data: coupon, error } = await supabase
                .from('coupons')
                .select('id, max_usage_per_user')
                .eq('code', couponCode.toUpperCase())
                .eq('is_active', true)
                .single();

            if (error || !coupon) {
                return { eligible: false, reason: 'Coupon not found' };
            }

            // Check user usage
            const { count } = await supabase
                .from('coupon_usage')
                .select('*', { count: 'exact', head: true })
                .eq('coupon_id', coupon.id)
                .eq('user_id', userId);

            if (count >= coupon.max_usage_per_user) {
                return {
                    eligible: false,
                    reason: `You can only use this coupon ${coupon.max_usage_per_user} time(s)`,
                    usedCount: count,
                    maxAllowed: coupon.max_usage_per_user
                };
            }

            return {
                eligible: true,
                usedCount: count,
                remainingUses: coupon.max_usage_per_user - count
            };

        } catch (error) {
            console.error('Error checking user eligibility:', error);
            return { eligible: false, reason: 'Error checking eligibility' };
        }
    }
}

module.exports = Coupon;
