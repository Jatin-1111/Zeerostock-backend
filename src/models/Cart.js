const { supabase } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

/**
 * Cart Model
 * Handles both guest (session-based) and user carts
 */
class Cart {
    /**
     * Generate guest session token
     */
    static generateSessionToken() {
        return crypto.randomBytes(32).toString('hex');
    }

    /**
     * Create or get guest cart session
     * @param {string} sessionToken - Session token
     * @returns {Promise<Object>} - Cart session
     */
    static async getOrCreateGuestSession(sessionToken = null) {
        try {
            if (sessionToken) {
                // Try to get existing session
                const { data: session, error } = await supabase
                    .from('cart_sessions')
                    .select('*')
                    .eq('session_token', sessionToken)
                    .eq('is_guest', true)
                    .single();

                if (!error && session && new Date(session.expires_at) > new Date()) {
                    return session;
                }
            }

            // Create new session
            const newToken = this.generateSessionToken();
            const { data: newSession, error: createError } = await supabase
                .from('cart_sessions')
                .insert({
                    session_token: newToken,
                    is_guest: true,
                    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
                })
                .select()
                .single();

            if (createError) throw createError;

            return newSession;

        } catch (error) {
            console.error('Error creating guest session:', error);
            throw error;
        }
    }

    /**
     * Get or create user cart
     * @param {string} userId - User ID
     * @returns {Promise<Object>} - User cart
     */
    static async getOrCreateUserCart(userId) {
        try {
            // Try to get existing cart
            let { data: cart, error } = await supabase
                .from('carts')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (error && error.code === 'PGRST116') {
                // Cart doesn't exist, create new one
                const { data: newCart, error: createError } = await supabase
                    .from('carts')
                    .insert({ user_id: userId })
                    .select()
                    .single();

                if (createError) throw createError;
                cart = newCart;
            } else if (error) {
                throw error;
            }

            return cart;

        } catch (error) {
            console.error('Error getting/creating user cart:', error);
            throw error;
        }
    }

    /**
     * Add item to cart
     * @param {Object} params - Cart item parameters
     * @returns {Promise<Object>} - Added cart item
     */
    static async addItem({ userId = null, sessionToken = null, productId, quantity }) {
        try {
            let generatedSessionToken = sessionToken;
            // Get product details
            const { data: product, error: productError } = await supabase
                .from('products')
                .select('id, title, price_after, discount_percent, listing_type, condition, unit, supplier_id, quantity, category_id, status')
                .eq('id', productId)
                .single();

            if (productError || !product) {
                throw new Error('PRODUCT_NOT_FOUND');
            }

            // Map quantity to stock for consistency
            product.stock = product.quantity;

            // Validate product status
            if (product.status !== 'active') {
                throw new Error('PRODUCT_NOT_AVAILABLE');
            }

            // Check if auction
            if (product.listing_type === 'auction') {
                throw new Error('AUCTION_ITEM_NOT_ALLOWED_IN_CART');
            }

            // Check stock availability
            if (product.stock < quantity) {
                throw new Error('NOT_ENOUGH_STOCK');
            }

            let cartId = null;
            let sessionId = null;

            if (userId) {
                // User cart
                const cart = await this.getOrCreateUserCart(userId);
                cartId = cart.id;

                // Check if item already exists
                const { data: existingItem } = await supabase
                    .from('cart_items')
                    .select('*')
                    .eq('cart_id', cartId)
                    .eq('product_id', productId)
                    .single();

                if (existingItem) {
                    // Update quantity
                    const newQuantity = existingItem.quantity + quantity;

                    if (product.stock < newQuantity) {
                        throw new Error('NOT_ENOUGH_STOCK');
                    }

                    const { data: updated, error: updateError } = await supabase
                        .from('cart_items')
                        .update({
                            quantity: newQuantity,
                            updated_at: new Date()
                        })
                        .eq('id', existingItem.id)
                        .select()
                        .single();

                    if (updateError) throw updateError;

                    return updated;
                }
            } else {
                // Guest cart - generate session token if not provided
                if (!sessionToken) {
                    sessionToken = this.generateSessionToken();
                    generatedSessionToken = sessionToken;
                }

                const session = await this.getOrCreateGuestSession(sessionToken);
                sessionId = session.id;

                // Check if item already exists
                const { data: existingItem } = await supabase
                    .from('cart_items')
                    .select('*')
                    .eq('session_id', sessionId)
                    .eq('product_id', productId)
                    .single();

                if (existingItem) {
                    // Update quantity
                    const newQuantity = existingItem.quantity + quantity;

                    if (product.stock < newQuantity) {
                        throw new Error('NOT_ENOUGH_STOCK');
                    }

                    const { data: updated, error: updateError } = await supabase
                        .from('cart_items')
                        .update({
                            quantity: newQuantity,
                            updated_at: new Date()
                        })
                        .eq('id', existingItem.id)
                        .select()
                        .single();

                    if (updateError) throw updateError;

                    return updated;
                }
            }

            // Insert new cart item
            const { data: newItem, error: insertError } = await supabase
                .from('cart_items')
                .insert({
                    cart_id: cartId,
                    session_id: sessionId,
                    product_id: productId,
                    quantity: quantity,
                    price_at_add: product.price_after,
                    discount_percent_at_add: product.discount_percent || 0,
                    listing_type: product.listing_type,
                    condition: product.condition,
                    unit: product.unit,
                    supplier_id: product.supplier_id,
                    is_available: true
                })
                .select()
                .single();

            if (insertError) throw insertError;
            // Return cart item with session token if generated
            return {
                ...newItem,
                _sessionToken: userId ? null : generatedSessionToken
            }
            return newItem;

        } catch (error) {
            console.error('Error adding item to cart:', error);
            throw error;
        }
    }

    /**
     * Get cart with all items and details
     * @param {string} userId - User ID
     * @param {string} sessionToken - Session token
     * @returns {Promise<Object>} - Complete cart data
     */
    static async getCart(userId = null, sessionToken = null) {
        try {
            let cartId = null;
            let sessionId = null;
            let couponInfo = null;

            if (userId) {
                const cart = await this.getOrCreateUserCart(userId);
                cartId = cart.id;
                if (cart.coupon_code) {
                    couponInfo = {
                        code: cart.coupon_code,
                        discount: cart.coupon_discount || 0
                    };
                }
            } else if (sessionToken) {
                const session = await this.getOrCreateGuestSession(sessionToken);
                sessionId = session.id;
                if (session.coupon_code) {
                    couponInfo = { code: session.coupon_code };
                }
            } else {
                return { items: [], summary: this.getEmptySummary() };
            }

            // Get cart items with product details
            let query = supabase
                .from('cart_items')
                .select('*');

            if (cartId) {
                query = query.eq('cart_id', cartId);
            } else {
                query = query.eq('session_id', sessionId);
            }

            const { data: items, error } = await query;

            if (error) throw error;

            // Manually fetch product and supplier details for each item
            const enrichedItems = await Promise.all((items || []).map(async (item) => {
                // Get product details
                const { data: product } = await supabase
                    .from('products')
                    .select('id, title, slug, image_url, price_after, discount_percent, quantity, status, listing_type, category_id')
                    .eq('id', item.product_id)
                    .single();

                // Get supplier details
                const { data: supplier } = await supabase
                    .from('users')
                    .select('id, company_name, is_verified')
                    .eq('id', item.supplier_id)
                    .single();

                let priceChanged = false;
                let stockChanged = false;
                let isAvailable = true;

                if (product) {
                    // Check if price changed
                    if (product.price_after !== item.price_at_add) {
                        priceChanged = true;
                    }

                    // Check stock
                    if (product.quantity < item.quantity) {
                        stockChanged = true;
                    }

                    // Check if product is still active
                    if (product.status !== 'active') {
                        isAvailable = false;
                    }

                    // Update flags if changed
                    if (priceChanged || stockChanged || !isAvailable) {
                        await supabase
                            .from('cart_items')
                            .update({
                                price_changed: priceChanged,
                                stock_changed: stockChanged,
                                is_available: isAvailable
                            })
                            .eq('id', item.id);
                    }
                }

                return {
                    itemId: item.id,
                    productId: item.product_id,
                    title: product?.title || 'Product Unavailable',
                    slug: product?.slug,
                    image: product?.image_url,
                    quantity: item.quantity,
                    price: product?.price_after || item.price_at_add,
                    originalPrice: item.price_at_add,
                    discountPercent: product?.discount_percent || item.discount_percent_at_add,
                    gstPercent: item.gst_percent,
                    listingType: item.listing_type,
                    condition: item.condition,
                    unit: item.unit,
                    seller: {
                        id: supplier?.id,
                        name: supplier?.company_name,
                        verified: supplier?.is_verified
                    },
                    availability: {
                        isAvailable,
                        priceChanged,
                        stockChanged,
                        currentStock: product?.quantity || 0
                    },
                    addedAt: item.added_at
                };
            }));

            return {
                items: enrichedItems,
                coupon: couponInfo
            };

        } catch (error) {
            console.error('Error getting cart:', error);
            throw error;
        }
    }

    /**
     * Update cart item quantity
     * @param {string} itemId - Cart item ID
     * @param {number} quantity - New quantity
     * @param {string} userId - User ID (for verification)
     * @returns {Promise<Object>} - Updated item
     */
    static async updateItemQuantity(itemId, quantity, userId = null) {
        try {
            if (quantity <= 0) {
                throw new Error('INVALID_QUANTITY');
            }

            // Get cart item with product details
            const { data: item, error } = await supabase
                .from('cart_items')
                .select('*, product:products!cart_items_product_id_fkey(quantity, status)')
                .eq('id', itemId)
                .single();

            if (error || !item) {
                throw new Error('CART_ITEM_NOT_FOUND');
            }

            // Verify ownership if userId provided
            if (userId && item.cart_id) {
                const { data: cart } = await supabase
                    .from('carts')
                    .select('user_id')
                    .eq('id', item.cart_id)
                    .single();

                if (cart?.user_id !== userId) {
                    throw new Error('UNAUTHORIZED');
                }
            }

            // Check stock
            if (item.product && item.product.quantity < quantity) {
                throw new Error('NOT_ENOUGH_STOCK');
            }

            // Update quantity
            const { data: updated, error: updateError } = await supabase
                .from('cart_items')
                .update({ quantity, updated_at: new Date() })
                .eq('id', itemId)
                .select()
                .single();

            if (updateError) throw updateError;

            return updated;

        } catch (error) {
            console.error('Error updating cart item:', error);
            throw error;
        }
    }

    /**
     * Remove item from cart
     * @param {string} itemId - Cart item ID
     * @param {string} userId - User ID (for verification)
     * @returns {Promise<boolean>} - Success status
     */
    static async removeItem(itemId, userId = null) {
        try {
            // Get cart item
            const { data: item, error: fetchError } = await supabase
                .from('cart_items')
                .select('cart_id')
                .eq('id', itemId)
                .single();

            if (fetchError || !item) {
                throw new Error('CART_ITEM_NOT_FOUND');
            }

            // Verify ownership if userId provided
            if (userId && item.cart_id) {
                const { data: cart } = await supabase
                    .from('carts')
                    .select('user_id')
                    .eq('id', item.cart_id)
                    .single();

                if (cart?.user_id !== userId) {
                    throw new Error('UNAUTHORIZED');
                }
            }

            // Delete item
            const { error: deleteError } = await supabase
                .from('cart_items')
                .delete()
                .eq('id', itemId);

            if (deleteError) throw deleteError;

            return true;

        } catch (error) {
            console.error('Error removing cart item:', error);
            throw error;
        }
    }

    /**
     * Clear entire cart
     * @param {string} userId - User ID
     * @param {string} sessionToken - Session token
     * @returns {Promise<boolean>} - Success status
     */
    static async clearCart(userId = null, sessionToken = null) {
        try {
            if (userId) {
                const cart = await this.getOrCreateUserCart(userId);

                const { error } = await supabase
                    .from('cart_items')
                    .delete()
                    .eq('cart_id', cart.id);

                if (error) throw error;

                // Clear coupon
                await supabase
                    .from('carts')
                    .update({
                        coupon_id: null,
                        coupon_code: null,
                        coupon_discount: 0
                    })
                    .eq('id', cart.id);

            } else if (sessionToken) {
                const session = await this.getOrCreateGuestSession(sessionToken);

                const { error } = await supabase
                    .from('cart_items')
                    .delete()
                    .eq('session_id', session.id);

                if (error) throw error;

                // Clear coupon
                await supabase
                    .from('cart_sessions')
                    .update({ coupon_code: null })
                    .eq('id', session.id);
            }

            return true;

        } catch (error) {
            console.error('Error clearing cart:', error);
            throw error;
        }
    }

    /**
     * Apply coupon to cart
     * @param {string} couponCode - Coupon code
     * @param {string} userId - User ID
     * @param {string} sessionToken - Session token
     * @returns {Promise<Object>} - Coupon application result
     */
    static async applyCoupon(couponCode, userId = null, sessionToken = null) {
        try {
            if (userId) {
                const cart = await this.getOrCreateUserCart(userId);

                const { data, error } = await supabase
                    .from('carts')
                    .update({ coupon_code: couponCode.toUpperCase() })
                    .eq('id', cart.id)
                    .select()
                    .single();

                if (error) throw error;
                return data;

            } else if (sessionToken) {
                const session = await this.getOrCreateGuestSession(sessionToken);

                const { data, error } = await supabase
                    .from('cart_sessions')
                    .update({ coupon_code: couponCode.toUpperCase() })
                    .eq('id', session.id)
                    .select()
                    .single();

                if (error) throw error;
                return data;
            }

        } catch (error) {
            console.error('Error applying coupon:', error);
            throw error;
        }
    }

    /**
     * Remove coupon from cart
     * @param {string} userId - User ID
     * @param {string} sessionToken - Session token
     * @returns {Promise<boolean>} - Success status
     */
    static async removeCoupon(userId = null, sessionToken = null) {
        try {
            if (userId) {
                const cart = await this.getOrCreateUserCart(userId);

                await supabase
                    .from('carts')
                    .update({
                        coupon_id: null,
                        coupon_code: null,
                        coupon_discount: 0
                    })
                    .eq('id', cart.id);

            } else if (sessionToken) {
                const session = await this.getOrCreateGuestSession(sessionToken);

                await supabase
                    .from('cart_sessions')
                    .update({ coupon_code: null })
                    .eq('id', session.id);
            }

            return true;

        } catch (error) {
            console.error('Error removing coupon:', error);
            throw error;
        }
    }

    /**
     * Merge guest cart into user cart on login
     * @param {string} sessionToken - Guest session token
     * @param {string} userId - User ID
     * @returns {Promise<Object>} - Merge result
     */
    static async mergeGuestCart(sessionToken, userId) {
        try {
            // Get guest session
            const { data: session, error: sessionError } = await supabase
                .from('cart_sessions')
                .select('id')
                .eq('session_token', sessionToken)
                .eq('is_guest', true)
                .single();

            if (sessionError || !session) {
                return { merged: false, reason: 'Guest cart not found' };
            }

            // Get guest cart items
            const { data: guestItems, error: itemsError } = await supabase
                .from('cart_items')
                .select('*')
                .eq('session_id', session.id);

            if (itemsError) throw itemsError;

            if (!guestItems || guestItems.length === 0) {
                return { merged: true, itemsMerged: 0 };
            }

            // Get or create user cart
            const userCart = await this.getOrCreateUserCart(userId);

            // Get existing user cart items
            const { data: existingItems } = await supabase
                .from('cart_items')
                .select('product_id, quantity')
                .eq('cart_id', userCart.id);

            const existingProductMap = new Map(
                (existingItems || []).map(item => [item.product_id, item.quantity])
            );

            let mergedCount = 0;
            let updatedCount = 0;

            // Merge items
            for (const item of guestItems) {
                if (existingProductMap.has(item.product_id)) {
                    // Update quantity in existing item
                    const currentQty = existingProductMap.get(item.product_id);
                    await supabase
                        .from('cart_items')
                        .update({ quantity: currentQty + item.quantity })
                        .eq('cart_id', userCart.id)
                        .eq('product_id', item.product_id);

                    updatedCount++;
                } else {
                    // Add new item to user cart
                    await supabase
                        .from('cart_items')
                        .insert({
                            cart_id: userCart.id,
                            session_id: null,
                            product_id: item.product_id,
                            quantity: item.quantity,
                            price_at_add: item.price_at_add,
                            discount_percent_at_add: item.discount_percent_at_add,
                            gst_percent: item.gst_percent,
                            listing_type: item.listing_type,
                            condition: item.condition,
                            unit: item.unit,
                            supplier_id: item.supplier_id,
                            is_available: item.is_available
                        });

                    mergedCount++;
                }
            }

            // Mark session as merged
            await supabase
                .from('cart_sessions')
                .update({
                    merged_to_user_cart: true,
                    merged_at: new Date(),
                    user_id: userId
                })
                .eq('id', session.id);

            // Delete guest cart items
            await supabase
                .from('cart_items')
                .delete()
                .eq('session_id', session.id);

            return {
                merged: true,
                itemsMerged: mergedCount,
                itemsUpdated: updatedCount,
                totalItems: mergedCount + updatedCount
            };

        } catch (error) {
            console.error('Error merging guest cart:', error);
            throw error;
        }
    }

    /**
     * Get empty summary structure
     */
    static getEmptySummary() {
        return {
            itemSubtotal: 0,
            discountAmount: 0,
            couponDiscount: 0,
            gstAmount: 0,
            shippingCharges: 0,
            platformFee: 0,
            finalPayableAmount: 0
        };
    }

    /**
     * Get cart item count
     * @param {string} userId - User ID
     * @param {string} sessionToken - Session token
     * @returns {Promise<number>} - Item count
     */
    static async getCartCount(userId = null, sessionToken = null) {
        try {
            let query;

            if (userId) {
                const cart = await this.getOrCreateUserCart(userId);
                query = supabase
                    .from('cart_items')
                    .select('*', { count: 'exact', head: true })
                    .eq('cart_id', cart.id);
            } else if (sessionToken) {
                const session = await this.getOrCreateGuestSession(sessionToken);
                query = supabase
                    .from('cart_items')
                    .select('*', { count: 'exact', head: true })
                    .eq('session_id', session.id);
            } else {
                return 0;
            }

            const { count, error } = await query;

            if (error) throw error;

            return count || 0;

        } catch (error) {
            console.error('Error getting cart count:', error);
            return 0;
        }
    }
}

module.exports = Cart;
