const { supabase } = require('../config/database');
const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const UserAddress = require('../models/UserAddress');
const NotificationService = require('./notification.service');
const PricingService = require('./pricing.service');
const { v4: uuidv4 } = require('uuid');

/**
 * Order Service
 * Business logic for order creation and management
 */
class OrderService {
    /**
     * Generate unique order number
     * Format: ORD-YYYY-NNNNNN
     */
    static async generateOrderNumber() {
        const year = new Date().getFullYear();
        const prefix = `ORD-${year}-`;

        // Get the latest order number for this year
        const { data, error } = await supabase
            .from('orders')
            .select('order_number')
            .like('order_number', `${prefix}%`)
            .order('created_at', { ascending: false })
            .limit(1);

        if (error) throw error;

        let nextNumber = 1;
        if (data && data.length > 0) {
            const lastNumber = parseInt(data[0].order_number.split('-')[2]);
            nextNumber = lastNumber + 1;
        }

        return `${prefix}${String(nextNumber).padStart(6, '0')}`;
    }

    /**
     * Generate unique tracking number
     * Format: ZEERO-YYYYMMDDHHMMSS-XXXXX (random 5 digits)
     */
    static generateTrackingNumber() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');

        const timestamp = `${year}${month}${day}${hours}${minutes}${seconds}`;
        const random = String(Math.floor(Math.random() * 100000)).padStart(5, '0');

        return `ZEERO-${timestamp}-${random}`;
    }

    /**
     * Validate checkout session and get cart items
     * @param {string} sessionId - Checkout session ID
     * @param {string} userId - User ID
     * @returns {Promise<Object>} - Session data with cart items and pricing
     */
    static async validateCheckoutSession(sessionId, userId) {
        // Get checkout session
        const { data: session, error: sessionError } = await supabase
            .from('checkout_sessions')
            .select('*')
            .eq('id', sessionId)
            .eq('user_id', userId)
            .single();

        if (sessionError || !session) {
            throw new Error('INVALID_CHECKOUT_SESSION');
        }

        // Check if session is expired
        if (new Date(session.expires_at) < new Date()) {
            throw new Error('CHECKOUT_SESSION_EXPIRED');
        }

        // Check if session is already used
        if (session.is_used) {
            throw new Error('CHECKOUT_SESSION_ALREADY_USED');
        }

        // Get cart items
        const cartData = await Cart.getCart(userId);

        if (!cartData.items || cartData.items.length === 0) {
            throw new Error('CART_IS_EMPTY');
        }

        // Validate cart items against session data
        const sessionData = session.cart_snapshot;
        if (!sessionData || !sessionData.itemCount || sessionData.itemCount !== cartData.items.length) {
            throw new Error('CART_MODIFIED_AFTER_CHECKOUT');
        }

        // Validate each item's quantity and price hasn't changed
        for (const currentItem of cartData.items) {
            const sessionItem = sessionData.items.find(item => item.productId === currentItem.productId);
            if (!sessionItem) {
                throw new Error('CART_MODIFIED_AFTER_CHECKOUT: Items changed');
            }
            if (sessionItem.quantity !== currentItem.quantity) {
                throw new Error('CART_MODIFIED_AFTER_CHECKOUT: Quantities changed');
            }
        }

        return {
            session,
            cartItems: cartData.items,
            pricing: sessionData.summary
        };
    }

    /**
     * Validate product availability and stock
     * @param {Array} cartItems - Cart items to validate
     * @returns {Promise<void>}
     */
    static async validateProductsAvailability(cartItems) {
        for (const item of cartItems) {
            const product = await Product.findById(item.productId);

            if (!product) {
                throw new Error(`PRODUCT_NOT_FOUND: ${item.title}`);
            }

            if (product.status !== 'active') {
                throw new Error(`PRODUCT_NOT_AVAILABLE: ${item.title}`);
            }

            if (product.quantity < item.quantity) {
                throw new Error(`INSUFFICIENT_STOCK: ${item.title} (Available: ${product.quantity}, Requested: ${item.quantity})`);
            }

            // Check if product has expired (for time-sensitive listings)
            if (product.expires_at && new Date(product.expires_at) < new Date()) {
                throw new Error(`PRODUCT_EXPIRED: ${item.title}`);
            }
        }
    }

    /**
     * Get and validate addresses
     * @param {string} userId - User ID
     * @param {string} shippingAddressId - Shipping address ID
     * @param {string} billingAddressId - Billing address ID (optional)
     * @returns {Promise<Object>} - Validated addresses
     */
    static async validateAddresses(userId, shippingAddressId, billingAddressId = null) {
        // Get shipping address
        const shippingAddress = await UserAddress.findById(shippingAddressId, userId);

        if (!shippingAddress || shippingAddress.user_id !== userId) {
            throw new Error('INVALID_SHIPPING_ADDRESS');
        }

        // Get billing address (use shipping if not provided)
        let billingAddress = shippingAddress;
        if (billingAddressId && billingAddressId !== shippingAddressId) {
            billingAddress = await UserAddress.findById(billingAddressId, userId);
            if (!billingAddress || billingAddress.user_id !== userId) {
                throw new Error('INVALID_BILLING_ADDRESS');
            }
        }

        return {
            shipping: shippingAddress,
            billing: billingAddress
        };
    }

    /**
     * Calculate delivery ETA
     * @param {Object} shippingAddress - Shipping address
     * @returns {Date} - Estimated delivery date
     */
    static calculateDeliveryEta(shippingAddress) {
        // Simple logic: 3-7 days based on location
        const baseDays = 3;
        const additionalDays = shippingAddress.state === 'Maharashtra' ? 0 : 2;

        const eta = new Date();
        eta.setDate(eta.getDate() + baseDays + additionalDays);
        return eta;
    }

    /**
     * Create order from checkout session
     * @param {Object} orderData - Order creation data
     * @returns {Promise<Object>} - Created order
     */
    static async createOrder(orderData) {
        const {
            userId,
            checkoutSessionId,
            shippingAddressId,
            billingAddressId,
            paymentMethod,
            paymentDetails,
            orderNotes
        } = orderData;

        let createdOrder = null;

        try {
            // 1. Validate checkout session and get cart data
            const { session, cartItems, pricing } = await this.validateCheckoutSession(
                checkoutSessionId,
                userId
            );

            // 2. Validate product availability
            await this.validateProductsAvailability(cartItems);

            // 3. Validate addresses
            const addresses = await this.validateAddresses(
                userId,
                shippingAddressId,
                billingAddressId
            );

            // 4. Generate order number
            const orderNumber = await this.generateOrderNumber();

            // 4.1 Generate tracking number
            const trackingNumber = this.generateTrackingNumber();

            // 5. Calculate delivery ETA
            const deliveryEta = this.calculateDeliveryEta(addresses.shipping);

            // 6. Prepare order data
            const orderCreateData = {
                id: uuidv4(),
                order_number: orderNumber,
                tracking_number: trackingNumber,
                user_id: userId,
                status: 'pending',
                payment_status: paymentMethod === 'cod' ? 'pending' : 'pending',

                // Pricing from checkout session
                items_subtotal: pricing.itemSubtotal,
                discount_amount: pricing.discountAmount,
                coupon_discount: pricing.couponDiscount,
                coupon_code: pricing.couponDetails?.code || null,
                gst_amount: pricing.gstAmount,
                cgst_amount: pricing.cgstAmount || null,
                sgst_amount: pricing.sgstAmount || null,
                igst_amount: pricing.igstAmount || null,
                shipping_charges: pricing.shippingCharges,
                platform_fee: pricing.platformFee,
                total_amount: pricing.finalPayableAmount,

                // Addresses (store as JSONB)
                shipping_address: {
                    name: addresses.shipping.full_name,
                    phone: addresses.shipping.phone,
                    addressLine1: addresses.shipping.address_line1,
                    addressLine2: addresses.shipping.address_line2,
                    city: addresses.shipping.city,
                    state: addresses.shipping.state,
                    pincode: addresses.shipping.pincode,
                    landmark: addresses.shipping.landmark,
                    addressType: addresses.shipping.address_type
                },
                billing_address: {
                    name: addresses.billing.full_name,
                    phone: addresses.billing.phone,
                    addressLine1: addresses.billing.address_line1,
                    addressLine2: addresses.billing.address_line2,
                    city: addresses.billing.city,
                    state: addresses.billing.state,
                    pincode: addresses.billing.pincode,
                    landmark: addresses.billing.landmark,
                    addressType: addresses.billing.address_type
                },

                // Delivery
                delivery_eta: deliveryEta,

                // Payment
                payment_method: paymentMethod,
                payment_transaction_id: paymentDetails?.transactionId || null,

                // Notes
                order_notes: orderNotes || null,

                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            // 7. Create order
            createdOrder = await Order.create(orderCreateData);

            // 8. Create order items
            const orderItems = cartItems.map(item => ({
                id: uuidv4(),
                order_id: createdOrder.id,
                product_id: item.productId,
                product_title: item.title,
                product_sku: item.sku || null,
                product_image: item.image || null,
                product_category: item.category || null,
                unit_price: item.originalPrice || item.price,
                discount_percent: item.discountPercent || 0,
                discount_amount: ((item.originalPrice || item.price) * (item.discountPercent || 0) / 100) * item.quantity,
                final_price: item.price,
                quantity: item.quantity,
                subtotal: item.price * item.quantity,
                gst_percent: 18,
                gst_amount: (item.price * item.quantity * 18) / 118, // GST included
                item_status: 'pending',
                supplier_id: item.supplierId || null,
                supplier_name: item.supplierName || null,
                supplier_city: item.supplierCity || null,
                created_at: new Date().toISOString()
            }));

            await OrderItem.createBulk(orderItems);

            // 9. Create initial order tracking entry
            await supabase
                .from('order_tracking')
                .insert([{
                    id: uuidv4(),
                    order_id: createdOrder.id,
                    status: 'pending',
                    title: 'Order Placed',
                    description: 'Your order has been successfully placed and is being processed.',
                    is_milestone: true,
                    created_at: new Date().toISOString()
                }]);

            // 10. Mark checkout session as used
            await supabase
                .from('checkout_sessions')
                .update({ is_used: true })
                .eq('id', checkoutSessionId);

            // 11. Clear user's cart
            await Cart.clearCart(userId);

            // 12. Update product inventory (reserve stock)
            for (const item of cartItems) {
                // Get current product to calculate new quantity
                const product = await Product.findById(item.productId);
                const newQuantity = product.quantity - item.quantity;

                await supabase
                    .from('products')
                    .update({
                        quantity: newQuantity,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', item.productId);
            }

            // 13. Send order confirmation notification
            await NotificationService.sendOrderConfirmation(userId, createdOrder);

            // 14. Return created order with items
            return {
                orderId: createdOrder.id,
                orderNumber: createdOrder.order_number,
                trackingNumber: createdOrder.tracking_number,
                status: createdOrder.status,
                paymentStatus: createdOrder.payment_status,
                totalAmount: createdOrder.total_amount,
                itemCount: orderItems.length,
                deliveryEta: createdOrder.delivery_eta,
                createdAt: createdOrder.created_at
            };

        } catch (error) {
            // Rollback: If order was created but something failed, mark as failed
            if (createdOrder) {
                await Order.update(createdOrder.id, {
                    status: 'failed',
                    admin_notes: `Order creation failed: ${error.message}`
                }).catch(err => console.error('Rollback failed:', err));
            }

            throw error;
        }
    }

    /**
     * Process payment (placeholder for payment gateway integration)
     * @param {Object} paymentData - Payment details
     * @returns {Promise<Object>} - Payment result
     */
    static async processPayment(paymentData) {
        const { amount, paymentMethod, paymentDetails } = paymentData;

        // TODO: Integrate with payment gateway (Razorpay, Stripe, etc.)

        if (paymentMethod === 'cod') {
            return {
                success: true,
                transactionId: null,
                message: 'Cash on Delivery selected'
            };
        }

        // Placeholder for online payment
        return {
            success: true,
            transactionId: paymentDetails?.transactionId || `TXN-${Date.now()}`,
            message: 'Payment processed successfully'
        };
    }

    /**
     * Validate order cancellation
     * @param {Object} order - Order to cancel
     * @returns {boolean} - Can be cancelled
     */
    static canCancelOrder(order) {
        const cancellableStatuses = ['pending', 'confirmed'];
        return cancellableStatuses.includes(order.status);
    }

    /**
     * Refund payment (placeholder for payment gateway integration)
     * @param {Object} order - Order to refund
     * @returns {Promise<Object>} - Refund result
     */
    static async refundPayment(order) {
        // TODO: Integrate with payment gateway refund API

        if (order.payment_method === 'cod') {
            return {
                success: true,
                refundId: null,
                message: 'No refund needed for COD'
            };
        }

        return {
            success: true,
            refundId: `REFUND-${Date.now()}`,
            amount: order.total_amount,
            message: 'Refund initiated successfully'
        };
    }
}

module.exports = OrderService;
