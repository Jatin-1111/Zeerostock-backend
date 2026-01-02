const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const NotificationService = require('../services/notification.service');
const OrderService = require('../services/order.service');
const PDFDocument = require('pdfkit');
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');
const { query: db } = require('../config/database');

/**
 * Order Controllers
 * Handles all buyer order operations
 */

/**
 * GET /api/buyer/orders/active
 * Get buyer's active orders
 */
const getActiveOrders = async (req, res) => {
    try {
        const userId = req.user.id;
        const { page, limit } = req.query;

        const result = await Order.getActiveOrders(userId, { page, limit });

        res.json({
            success: true,
            message: 'Active orders retrieved successfully',
            data: result
        });

    } catch (error) {
        console.error('Error getting active orders:', error);
        res.status(500).json({
            success: false,
            errorCode: 'SERVER_ERROR',
            message: 'Failed to retrieve active orders'
        });
    }
};

/**
 * GET /api/buyer/orders/history
 * Get buyer's order history
 */
const getOrderHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        const { page, limit, status } = req.query;

        const result = await Order.getOrderHistory(userId, { page, limit, status });

        res.json({
            success: true,
            message: 'Order history retrieved successfully',
            data: result
        });

    } catch (error) {
        console.error('Error getting order history:', error);
        res.status(500).json({
            success: false,
            errorCode: 'SERVER_ERROR',
            message: 'Failed to retrieve order history'
        });
    }
};

/**
 * GET /api/buyer/orders/:orderId
 * Get specific order details
 */
const getOrderById = async (req, res) => {
    try {
        const userId = req.user.id;
        const { orderId } = req.params;

        const order = await Order.getOrderWithTracking(orderId, userId);

        if (!order) {
            return res.status(404).json({
                success: false,
                errorCode: 'ORDER_NOT_FOUND',
                message: 'Order not found'
            });
        }

        // Format the response
        const formattedOrder = {
            orderId: order.id,
            orderNumber: order.order_number,
            status: order.status,
            paymentStatus: order.payment_status,

            // Items
            items: order.order_items.map(item => ({
                itemId: item.id,
                productId: item.product_id,
                productTitle: item.product_title,
                productImage: item.product_image,
                productSku: item.product_sku,
                quantity: item.quantity,
                unitPrice: item.unit_price,
                discount: item.discount_amount,
                finalPrice: item.final_price,
                subtotal: item.subtotal,
                itemStatus: item.item_status,
                supplier: {
                    id: item.supplier_id,
                    name: item.supplier_name,
                    city: item.supplier_city
                }
            })),

            // Pricing
            pricing: {
                itemsSubtotal: order.items_subtotal,
                discountAmount: order.discount_amount,
                couponDiscount: order.coupon_discount,
                couponCode: order.coupon_code,
                gstAmount: order.gst_amount,
                shippingCharges: order.shipping_charges,
                platformFee: order.platform_fee,
                totalAmount: order.total_amount
            },

            // Shipping
            shippingAddress: order.shipping_address,
            billingAddress: order.billing_address,
            deliveryEta: order.delivery_eta,
            shippingPartner: order.shipping_partner,
            trackingNumber: order.tracking_number,

            // Payment
            paymentMethod: order.payment_method,
            paymentTransactionId: order.payment_transaction_id,
            paymentDate: order.payment_date,

            // Documents
            invoiceUrl: order.invoice_url,
            invoiceNumber: order.invoice_number,

            // Tracking
            tracking: order.order_tracking?.map(track => ({
                status: track.status,
                title: track.title,
                description: track.description,
                location: track.location,
                isMilestone: track.is_milestone,
                timestamp: track.created_at
            })) || [],

            // Timestamps
            createdAt: order.created_at,
            updatedAt: order.updated_at,
            completedAt: order.completed_at
        };

        res.json({
            success: true,
            message: 'Order details retrieved successfully',
            data: formattedOrder
        });

    } catch (error) {
        console.error('Error getting order details:', error);
        res.status(500).json({
            success: false,
            errorCode: 'SERVER_ERROR',
            message: 'Failed to retrieve order details'
        });
    }
};

/**
 * GET /api/buyer/orders/:orderId/tracking
 * Get order tracking information
 */
const getOrderTracking = async (req, res) => {
    try {
        const userId = req.user.id;
        const { orderId } = req.params;

        // First verify order belongs to user
        const order = await Order.getOrderWithTracking(orderId, userId);

        if (!order) {
            return res.status(404).json({
                success: false,
                errorCode: 'ORDER_NOT_FOUND',
                message: 'Order not found'
            });
        }

        const trackingData = {
            orderId: order.id,
            orderNumber: order.order_number,
            status: order.status,
            shippingPartner: order.shipping_partner,
            trackingNumber: order.tracking_number,
            deliveryEta: order.delivery_eta,

            trackingUpdates: order.order_tracking?.map(track => ({
                status: track.status,
                title: track.title,
                description: track.description,
                location: track.location,
                isMilestone: track.is_milestone,
                timestamp: track.created_at
            })) || [],

            currentLocation: order.order_tracking?.length > 0
                ? order.order_tracking[order.order_tracking.length - 1].location
                : null
        };

        res.json({
            success: true,
            message: 'Order tracking retrieved successfully',
            data: trackingData
        });

    } catch (error) {
        console.error('Error getting order tracking:', error);
        res.status(500).json({
            success: false,
            errorCode: 'SERVER_ERROR',
            message: 'Failed to retrieve order tracking'
        });
    }
};

/**
 * POST /api/buyer/orders/:orderId/cancel
 * Cancel an order
 */
const cancelOrder = async (req, res) => {
    try {
        const userId = req.user.id;
        const { orderId } = req.params;
        const { reason } = req.body;

        // Get order to check status
        const order = await Order.getOrderWithTracking(orderId, userId);

        if (!order) {
            return res.status(404).json({
                success: false,
                errorCode: 'ORDER_NOT_FOUND',
                message: 'Order not found'
            });
        }

        // Check if order can be cancelled
        if (!['pending', 'confirmed'].includes(order.status)) {
            return res.status(400).json({
                success: false,
                errorCode: 'ORDER_CANNOT_BE_CANCELLED',
                message: 'This order cannot be cancelled. Please contact support.'
            });
        }

        // Cancel the order
        const cancelledOrder = await Order.cancelOrder(orderId, userId, reason);

        // Add tracking update
        await Order.addTracking(orderId, {
            status: 'cancelled',
            title: 'Order Cancelled',
            description: `Order cancelled by buyer. Reason: ${reason}`,
            is_milestone: true
        });

        // Send notification
        await NotificationService.sendOrderCancelled(userId, cancelledOrder);

        res.json({
            success: true,
            message: 'Order cancelled successfully',
            data: {
                orderId: cancelledOrder.id,
                orderNumber: cancelledOrder.order_number,
                status: cancelledOrder.status,
                cancellationReason: cancelledOrder.cancellation_reason,
                cancelledAt: cancelledOrder.cancelled_at
            }
        });

    } catch (error) {
        console.error('Error cancelling order:', error);
        res.status(500).json({
            success: false,
            errorCode: 'SERVER_ERROR',
            message: 'Failed to cancel order'
        });
    }
};

/**
 * GET /api/buyer/orders/stats
 * Get buyer order statistics
 */
const getOrderStats = async (req, res) => {
    try {
        const userId = req.user.id;

        const stats = await Order.getBuyerStats(userId);

        // Transform snake_case to camelCase for frontend
        const formattedStats = {
            totalOrders: stats.total_orders || 0,
            activeOrders: stats.active_orders || 0,
            completedOrders: stats.completed_orders || 0,
            cancelledOrders: stats.cancelled_orders || 0,
            totalSpent: parseFloat(stats.total_spent || 0),
            averageOrderValue: parseFloat(stats.average_order_value || 0)
        };

        res.json({
            success: true,
            message: 'Order statistics retrieved successfully',
            data: formattedStats
        });

    } catch (error) {
        console.error('Error getting order stats:', error);
        res.status(500).json({
            success: false,
            errorCode: 'SERVER_ERROR',
            message: 'Failed to retrieve order statistics'
        });
    }
};

/**
 * POST /api/buyer/orders/create
 * Create a new order from checkout session
 */
const createOrder = async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            checkoutSessionId,
            shippingAddressId,
            billingAddressId,
            paymentMethod,
            paymentDetails,
            orderNotes
        } = req.body;

        // Build order data, excluding undefined values
        const orderData = {
            userId,
            checkoutSessionId,
            shippingAddressId,
            paymentMethod,
        };

        // Add optional fields only if they exist
        if (billingAddressId) {
            orderData.billingAddressId = billingAddressId;
        }
        if (paymentDetails) {
            orderData.paymentDetails = paymentDetails;
        }
        if (orderNotes) {
            orderData.orderNotes = orderNotes;
        }

        // Create order using OrderService
        const order = await OrderService.createOrder(orderData);

        res.status(201).json({
            success: true,
            message: 'Order created successfully',
            data: order
        });

    } catch (error) {
        console.error('Error creating order:', error);

        // Handle specific errors
        const errorMessages = {
            'INVALID_CHECKOUT_SESSION': 'Invalid or expired checkout session. Please try checkout again.',
            'CHECKOUT_SESSION_EXPIRED': 'Your checkout session has expired. Please return to cart and checkout again.',
            'CHECKOUT_SESSION_ALREADY_USED': 'This checkout session has already been used to place an order.',
            'CART_IS_EMPTY': 'Your cart is empty. Cannot create order.',
            'CART_MODIFIED_AFTER_CHECKOUT: Items changed': 'Cart items have changed since checkout. Please review your cart and checkout again.',
            'CART_MODIFIED_AFTER_CHECKOUT: Quantities changed': 'Item quantities have changed since checkout. Please review your cart and checkout again.',
            'CART_MODIFIED_AFTER_CHECKOUT': 'Your cart has been modified. Please return to cart and checkout again.',
            'INVALID_SHIPPING_ADDRESS': 'The selected shipping address is invalid or has been deleted.',
            'INVALID_BILLING_ADDRESS': 'The selected billing address is invalid or has been deleted.',
            'PRODUCT_NOT_FOUND': 'One or more products in your cart are no longer available.',
            'PRODUCT_NOT_AVAILABLE': 'One or more products in your cart are currently unavailable.',
            'INSUFFICIENT_STOCK': 'Insufficient stock for one or more products. Please update quantities.',
            'PRODUCT_EXPIRED': 'One or more products in your cart have expired and are no longer available.'
        };

        const errorCode = error.message.split(':')[0];
        const message = errorMessages[errorCode] || error.message || 'Failed to create order';
        const statusCode = ['INVALID_SHIPPING_ADDRESS', 'INVALID_BILLING_ADDRESS', 'CART_MODIFIED_AFTER_CHECKOUT'].includes(errorCode) ? 400 :
            ['PRODUCT_NOT_FOUND'].includes(errorCode) ? 404 : 500;

        res.status(statusCode).json({
            success: false,
            errorCode: errorCode || 'ORDER_CREATION_FAILED',
            message,
            details: error.message
        });
    }
};

/**
 * GET /api/buyer/orders/:orderId/invoice
 * Download PDF invoice for an order
 */
const downloadInvoice = async (req, res) => {
    try {
        const userId = req.user.id;
        const { orderId } = req.params;

        // Get order details
        const order = await Order.getOrderWithTracking(orderId, userId);

        if (!order) {
            return res.status(404).json({
                success: false,
                errorCode: 'ORDER_NOT_FOUND',
                message: 'Order not found'
            });
        }

        // Only generate invoice for confirmed/completed orders
        if (!['confirmed', 'processing', 'shipped', 'delivered'].includes(order.status)) {
            return res.status(400).json({
                success: false,
                errorCode: 'INVOICE_NOT_AVAILABLE',
                message: 'Invoice is only available for confirmed orders'
            });
        }

        // Create PDF document
        const doc = new PDFDocument({ margin: 50 });

        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=invoice-${order.orderNumber}.pdf`);

        // Pipe PDF to response
        doc.pipe(res);

        // Generate invoice content
        generateInvoiceHeader(doc, order);
        generateInvoiceBody(doc, order);
        generateInvoiceFooter(doc, order);

        // Finalize PDF
        doc.end();

    } catch (error) {
        console.error('Error generating invoice:', error);

        // If headers not sent, send error response
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                errorCode: 'INVOICE_GENERATION_FAILED',
                message: 'Failed to generate invoice'
            });
        }
    }
};

// Helper function to generate invoice header
function generateInvoiceHeader(doc, order) {
    doc
        .fontSize(20)
        .text('INVOICE', 50, 50, { align: 'right' })
        .fontSize(10)
        .text(`Invoice #: ${order.invoiceNumber || order.orderNumber}`, 50, 80, { align: 'right' })
        .text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`, 50, 95, { align: 'right' })
        .text(`Order #: ${order.orderNumber}`, 50, 110, { align: 'right' })
        .moveDown();

    // Company details (left side)
    doc
        .fontSize(14)
        .text('Zeerostock', 50, 50)
        .fontSize(10)
        .text('B2B Marketplace', 50, 70)
        .text('India', 50, 85)
        .moveDown();

    // Customer details
    doc
        .fontSize(12)
        .text('Bill To:', 50, 150)
        .fontSize(10)
        .text(order.billingAddress.name, 50, 170)
        .text(order.billingAddress.addressLine1, 50, 185)
        .text(`${order.billingAddress.city}, ${order.billingAddress.state} ${order.billingAddress.pincode}`, 50, 200)
        .text(`Phone: ${order.billingAddress.phone}`, 50, 215);

    // Shipping address (if different)
    if (order.shippingAddress.addressLine1 !== order.billingAddress.addressLine1) {
        doc
            .fontSize(12)
            .text('Ship To:', 300, 150)
            .fontSize(10)
            .text(order.shippingAddress.name, 300, 170)
            .text(order.shippingAddress.addressLine1, 300, 185)
            .text(`${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.pincode}`, 300, 200)
            .text(`Phone: ${order.shippingAddress.phone}`, 300, 215);
    }

    doc.moveDown(2);
}

// Helper function to generate invoice body with items table
function generateInvoiceBody(doc, order) {
    const tableTop = 260;
    const itemCodeX = 50;
    const descriptionX = 120;
    const quantityX = 300;
    const priceX = 370;
    const amountX = 450;

    // Table header
    doc
        .fontSize(10)
        .text('Item', itemCodeX, tableTop, { bold: true })
        .text('Description', descriptionX, tableTop)
        .text('Qty', quantityX, tableTop)
        .text('Price', priceX, tableTop)
        .text('Amount', amountX, tableTop);

    // Draw line under header
    doc
        .moveTo(50, tableTop + 15)
        .lineTo(550, tableTop + 15)
        .stroke();

    // Table rows
    let yPosition = tableTop + 25;

    order.items.forEach((item, i) => {
        const itemTotal = item.finalPrice * item.quantity;

        doc
            .fontSize(9)
            .text(item.productSku || `#${i + 1}`, itemCodeX, yPosition, { width: 60 })
            .text(item.productTitle, descriptionX, yPosition, { width: 170 })
            .text(item.quantity.toString(), quantityX, yPosition, { width: 50 })
            .text(`₹${item.finalPrice.toFixed(2)}`, priceX, yPosition, { width: 70 })
            .text(`₹${itemTotal.toFixed(2)}`, amountX, yPosition, { width: 90, align: 'right' });

        yPosition += 25;
    });

    // Draw line before totals
    doc
        .moveTo(50, yPosition)
        .lineTo(550, yPosition)
        .stroke();

    yPosition += 15;

    // Totals section
    const totalsX = 370;
    const totalsValueX = 450;

    doc
        .fontSize(10)
        .text('Subtotal:', totalsX, yPosition)
        .text(`₹${order.pricing.itemsSubtotal.toFixed(2)}`, totalsValueX, yPosition, { align: 'right' });

    yPosition += 20;

    if (order.pricing.discountAmount > 0) {
        doc
            .text('Discount:', totalsX, yPosition)
            .text(`-₹${order.pricing.discountAmount.toFixed(2)}`, totalsValueX, yPosition, { align: 'right' });
        yPosition += 20;
    }

    if (order.pricing.couponDiscount > 0) {
        doc
            .text(`Coupon (${order.pricing.couponCode}):`, totalsX, yPosition)
            .text(`-₹${order.pricing.couponDiscount.toFixed(2)}`, totalsValueX, yPosition, { align: 'right' });
        yPosition += 20;
    }

    doc
        .text('GST:', totalsX, yPosition)
        .text(`₹${order.pricing.gstAmount.toFixed(2)}`, totalsValueX, yPosition, { align: 'right' });

    yPosition += 20;

    if (order.pricing.shippingCharges > 0) {
        doc
            .text('Shipping:', totalsX, yPosition)
            .text(`₹${order.pricing.shippingCharges.toFixed(2)}`, totalsValueX, yPosition, { align: 'right' });
        yPosition += 20;
    }

    if (order.pricing.platformFee > 0) {
        doc
            .text('Platform Fee:', totalsX, yPosition)
            .text(`₹${order.pricing.platformFee.toFixed(2)}`, totalsValueX, yPosition, { align: 'right' });
        yPosition += 20;
    }

    // Draw line before grand total
    doc
        .moveTo(370, yPosition)
        .lineTo(550, yPosition)
        .stroke();

    yPosition += 10;

    // Grand total
    doc
        .fontSize(12)
        .text('Total:', totalsX, yPosition, { bold: true })
        .text(`₹${order.pricing.totalAmount.toFixed(2)}`, totalsValueX, yPosition, { align: 'right', bold: true });

    yPosition += 30;

    // Payment info
    doc
        .fontSize(10)
        .text(`Payment Method: ${order.paymentMethod.toUpperCase()}`, 50, yPosition)
        .text(`Payment Status: ${order.paymentStatus.toUpperCase()}`, 50, yPosition + 15);

    if (order.paymentTransactionId) {
        doc.text(`Transaction ID: ${order.paymentTransactionId}`, 50, yPosition + 30);
    }
}

// Helper function to generate invoice footer
function generateInvoiceFooter(doc, order) {
    const footerTop = 700;

    doc
        .fontSize(8)
        .text('Thank you for your business!', 50, footerTop, { align: 'center' })
        .text('For any queries, contact us at support@zeerostock.com', 50, footerTop + 15, { align: 'center' })
        .text('This is a computer-generated invoice and does not require a signature', 50, footerTop + 30, { align: 'center' });
}

/**
 * GET /api/buyer/orders/export
 * Export orders to Excel file
 */
const exportOrders = async (req, res) => {
    try {
        const userId = req.user.id;
        const { status, startDate, endDate, format = 'xlsx' } = req.query;

        // Build query filters
        const filters = { status };
        if (startDate) filters.startDate = startDate;
        if (endDate) filters.endDate = endDate;

        // Get all orders (without pagination) for export
        const result = await Order.getOrderHistory(userId, {
            page: 1,
            limit: 10000, // Large limit to get all orders
            ...filters
        });

        if (!result.orders || result.orders.length === 0) {
            return res.status(404).json({
                success: false,
                errorCode: 'NO_ORDERS_TO_EXPORT',
                message: 'No orders found to export'
            });
        }

        // Prepare data for export
        const exportData = result.orders.map(order => ({
            'Order Number': order.orderNumber,
            'Order Date': new Date(order.createdAt).toLocaleDateString(),
            'Status': order.status.toUpperCase(),
            'Payment Status': order.paymentStatus.toUpperCase(),
            'Payment Method': order.paymentMethod.toUpperCase(),
            'Items Count': order.itemCount,
            'Subtotal': `₹${order.itemsSubtotal.toFixed(2)}`,
            'Discount': `₹${(order.discountAmount + order.couponDiscount).toFixed(2)}`,
            'GST': `₹${order.gstAmount.toFixed(2)}`,
            'Shipping': `₹${order.shippingCharges.toFixed(2)}`,
            'Total Amount': `₹${order.totalAmount.toFixed(2)}`,
            'Shipping Address': `${order.shippingAddress.city}, ${order.shippingAddress.state}`,
            'Tracking Number': order.trackingNumber || 'N/A',
            'Delivery ETA': order.deliveryEta ? new Date(order.deliveryEta).toLocaleDateString() : 'N/A'
        }));

        if (format === 'csv') {
            // Generate CSV
            const csv = convertToCSV(exportData);

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=orders-export-${Date.now()}.csv`);
            res.send(csv);
        } else {
            // Generate Excel file
            const workbook = xlsx.utils.book_new();
            const worksheet = xlsx.utils.json_to_sheet(exportData);

            // Set column widths
            worksheet['!cols'] = [
                { wch: 15 }, // Order Number
                { wch: 12 }, // Order Date
                { wch: 12 }, // Status
                { wch: 15 }, // Payment Status
                { wch: 15 }, // Payment Method
                { wch: 12 }, // Items Count
                { wch: 12 }, // Subtotal
                { wch: 12 }, // Discount
                { wch: 12 }, // GST
                { wch: 12 }, // Shipping
                { wch: 15 }, // Total Amount
                { wch: 25 }, // Shipping Address
                { wch: 20 }, // Tracking Number
                { wch: 15 }  // Delivery ETA
            ];

            xlsx.utils.book_append_sheet(workbook, worksheet, 'Orders');

            // Generate buffer
            const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=orders-export-${Date.now()}.xlsx`);
            res.send(buffer);
        }

    } catch (error) {
        console.error('Error exporting orders:', error);

        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                errorCode: 'EXPORT_FAILED',
                message: 'Failed to export orders'
            });
        }
    }
};

// Helper function to convert JSON to CSV
function convertToCSV(data) {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvRows = [];

    // Add header row
    csvRows.push(headers.join(','));

    // Add data rows
    for (const row of data) {
        const values = headers.map(header => {
            const value = row[header];
            // Escape commas and quotes
            return `"${String(value).replace(/"/g, '""')}"`;
        });
        csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
}

/**
 * GET /api/buyer/savings
 * Get buyer's cost savings analytics
 */
const getCostSavings = async (req, res) => {
    try {
        const userId = req.user.id;

        // Get all completed orders
        const { data: orders, error: ordersError } = await Order.supabase
            .from('orders')
            .select(`
                id,
                total_amount,
                discount_amount,
                order_items (
                    product_id,
                    quantity,
                    unit_price,
                    discount
                )
            `)
            .eq('buyer_id', userId)
            .eq('status', 'delivered')
            .order('created_at', { ascending: false });

        if (ordersError) {
            console.error('Error fetching orders for savings:', ordersError);
        }

        // Calculate savings
        let totalSpent = 0;
        let totalDiscount = 0;
        const categorySavings = {};

        if (orders && orders.length > 0) {
            for (const order of orders) {
                totalSpent += parseFloat(order.total_amount || 0);
                totalDiscount += parseFloat(order.discount_amount || 0);

                // Get category info for each item (simplified - you may need to enhance this)
                if (order.order_items && order.order_items.length > 0) {
                    for (const item of order.order_items) {
                        const itemDiscount = parseFloat(item.discount || 0) * item.quantity;

                        // For now, using generic categories - you can enhance this with actual product categories
                        const category = 'General';
                        if (!categorySavings[category]) {
                            categorySavings[category] = {
                                totalDiscount: 0,
                                totalSpent: 0
                            };
                        }

                        categorySavings[category].totalDiscount += itemDiscount;
                        categorySavings[category].totalSpent += parseFloat(item.unit_price) * item.quantity;
                    }
                }
            }
        }

        // Calculate average savings percentage
        const avgSavingsPercentage = totalSpent > 0
            ? Math.round((totalDiscount / (totalSpent + totalDiscount)) * 100)
            : 0;

        // Format category savings
        const categorySavingsArray = Object.entries(categorySavings).map(([category, data]) => {
            const percentage = data.totalSpent > 0
                ? Math.round((data.totalDiscount / (data.totalSpent + data.totalDiscount)) * 100)
                : 0;
            return {
                category,
                percentage: percentage > 0 ? `-${percentage}%` : '0%',
                amount: data.totalDiscount
            };
        }).slice(0, 5); // Top 5 categories

        // If no real data, provide default mock data
        const finalData = orders && orders.length > 0
            ? {
                averageSavings: avgSavingsPercentage > 0 ? `-${avgSavingsPercentage}%` : '0%',
                totalSaved: totalDiscount,
                categorySavings: categorySavingsArray.length > 0 ? categorySavingsArray : [
                    { category: 'Electronics', percentage: '-15%', amount: 0 },
                    { category: 'Automotive', percentage: '-12%', amount: 0 },
                    { category: 'Medical', percentage: '-18%', amount: 0 }
                ]
            }
            : {
                averageSavings: '0%',
                totalSaved: 0,
                categorySavings: [
                    { category: 'Electronics', percentage: '0%', amount: 0 },
                    { category: 'Automotive', percentage: '0%', amount: 0 },
                    { category: 'Medical', percentage: '0%', amount: 0 }
                ]
            };

        res.json({
            success: true,
            message: 'Cost savings retrieved successfully',
            data: finalData
        });

    } catch (error) {
        console.error('Error getting cost savings:', error);
        res.status(500).json({
            success: false,
            errorCode: 'SERVER_ERROR',
            message: 'Failed to retrieve cost savings'
        });
    }
};

/**
 * GET /api/buyer/payments
 * Get buyer's payment transactions
 */
const getPayments = async (req, res) => {
    try {
        const buyerId = req.user.id;
        const { page = 1, limit = 20, status, startDate, endDate } = req.query;
        const offset = (page - 1) * limit;

        let whereClause = 'WHERE p.buyer_id = $1';
        const params = [buyerId];
        let paramIndex = 2;

        if (status) {
            whereClause += ` AND p.status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }

        if (startDate) {
            whereClause += ` AND p.created_at >= $${paramIndex}`;
            params.push(startDate);
            paramIndex++;
        }

        if (endDate) {
            whereClause += ` AND p.created_at <= $${paramIndex}`;
            params.push(endDate);
            paramIndex++;
        }

        // Get transactions
        const transactionsQuery = `
            SELECT 
                p.id,
                p.transaction_id,
                p.order_id,
                o.order_number,
                p.amount,
                p.payment_method,
                p.payment_gateway,
                p.status,
                p.created_at,
                p.updated_at,
                u.first_name || ' ' || u.last_name as supplier_name,
                u.company_name as supplier_company
            FROM payments p
            LEFT JOIN orders o ON p.order_id = o.id
            LEFT JOIN users u ON p.supplier_id = u.id
            ${whereClause}
            ORDER BY p.created_at DESC
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;

        params.push(limit, offset);

        // Get summary stats
        const summaryQuery = `
            SELECT 
                COUNT(*) as total_transactions,
                SUM(amount) FILTER (WHERE status = 'completed') as total_spent,
                SUM(amount) FILTER (WHERE status = 'pending') as pending_amount,
                SUM(amount) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days' AND status = 'completed') as spent_this_month
            FROM payments
            WHERE buyer_id = $1
        `;

        const [transactions, summary, count] = await Promise.all([
            db(transactionsQuery, params),
            db(summaryQuery, [buyerId]),
            db(`SELECT COUNT(*) as total FROM payments p ${whereClause}`, params.slice(0, paramIndex - 1))
        ]);

        res.json({
            success: true,
            message: 'Payments retrieved successfully',
            data: {
                summary: {
                    total_transactions: parseInt(summary.rows[0].total_transactions) || 0,
                    total_spent: parseFloat(summary.rows[0].total_spent) || 0,
                    pending_amount: parseFloat(summary.rows[0].pending_amount) || 0,
                    spent_this_month: parseFloat(summary.rows[0].spent_this_month) || 0
                },
                transactions: transactions.rows,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: parseInt(count.rows[0].total),
                    totalPages: Math.ceil(parseInt(count.rows[0].total) / limit)
                }
            }
        });
    } catch (error) {
        console.error('Error getting payments:', error);
        res.status(500).json({
            success: false,
            errorCode: 'SERVER_ERROR',
            message: 'Failed to retrieve payments'
        });
    }
};

/**
 * GET /api/buyer/invoices
 * Get buyer's invoices
 */
const getInvoices = async (req, res) => {
    try {
        const buyerId = req.user.id;
        const { page = 1, limit = 20, status } = req.query;
        const offset = (page - 1) * limit;

        let whereClause = 'WHERE i.buyer_id = $1';
        const params = [buyerId];
        let paramIndex = 2;

        if (status && status !== 'all') {
            whereClause += ` AND i.status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }

        const invoicesQuery = `
            SELECT 
                i.id,
                i.invoice_number,
                i.order_id,
                o.order_number,
                i.amount,
                i.tax_amount,
                i.total_amount,
                i.status,
                i.issue_date,
                i.due_date,
                i.paid_date,
                i.created_at,
                u.first_name || ' ' || u.last_name as supplier_name,
                u.company_name as supplier_company,
                u.business_email as supplier_email
            FROM invoices i
            LEFT JOIN orders o ON i.order_id = o.id
            LEFT JOIN users u ON i.supplier_id = u.id
            ${whereClause}
            ORDER BY i.created_at DESC
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;

        params.push(limit, offset);

        const [invoices, count] = await Promise.all([
            db(invoicesQuery, params),
            db(`SELECT COUNT(*) as total FROM invoices i ${whereClause}`, params.slice(0, paramIndex - 1))
        ]);

        res.json({
            success: true,
            message: 'Invoices retrieved successfully',
            data: {
                invoices: invoices.rows,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: parseInt(count.rows[0].total),
                    totalPages: Math.ceil(parseInt(count.rows[0].total) / limit)
                }
            }
        });
    } catch (error) {
        console.error('Error getting invoices:', error);
        res.status(500).json({
            success: false,
            errorCode: 'SERVER_ERROR',
            message: 'Failed to retrieve invoices'
        });
    }
};

module.exports = {
    getActiveOrders,
    getOrderHistory,
    getOrderById,
    getOrderTracking,
    cancelOrder,
    getOrderStats,
    createOrder,
    downloadInvoice,
    exportOrders,
    getCostSavings,
    getPayments,
    getInvoices
};
