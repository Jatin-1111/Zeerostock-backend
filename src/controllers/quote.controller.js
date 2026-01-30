const { Quote, QuoteMessage, RFQ } = require('../models');
const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const Notification = require('../models/Notification');
const User = require('../models/User');
const emailService = require('../services/email.service');
const { Op } = require('sequelize');
const { supabase } = require('../config/database');

/**
 * Get all quotes for the logged-in buyer
 * Includes pagination, filtering, and search
 */
exports.getMyQuotes = async (req, res) => {
    try {
        const buyerId = req.user.id;
        const {
            page = 1,
            limit = 10,
            status,
            rfqId,
            search,
            sortBy = 'createdAt',
            sortOrder = 'DESC'
        } = req.query;

        const offset = (page - 1) * limit;

        // Build where clause
        const where = {};

        // Filter by status
        if (status) {
            where.status = status;
        }

        // Filter by RFQ
        if (rfqId) {
            where.rfqId = rfqId;
        }

        // Search by quote number or supplier name
        if (search) {
            where[Op.or] = [
                { quoteNumber: { [Op.iLike]: `%${search}%` } },
                { '$supplier.company_name$': { [Op.iLike]: `%${search}%` } }
            ];
        }

        // Get quotes where the buyer is the RFQ owner
        const { rows: quotes, count: total } = await Quote.findAndCountAll({
            where,
            include: [
                {
                    model: RFQ,
                    as: 'rfq',
                    where: { buyerId },
                    attributes: ['id', 'rfqNumber', 'title', 'categoryId', 'quantity', 'status', 'budgetMin', 'budgetMax']
                }
            ],
            limit: parseInt(limit),
            offset,
            order: [[sortBy, sortOrder]],
            distinct: true
        });

        // Fetch supplier and product details from Supabase
        const quotesWithDetails = await Promise.all(
            quotes.map(async (quote) => {
                const quoteJSON = quote.toJSON();

                // Fetch supplier details
                const { data: supplier } = await supabase
                    .from('users')
                    .select('id, first_name, last_name, business_email, company_name, mobile')
                    .eq('id', quoteJSON.supplierId)
                    .single();

                // Fetch product details if productId exists
                let product = null;
                if (quoteJSON.productId) {
                    const { data: productData } = await supabase
                        .from('products')
                        .select('id, name, sku, image_url')
                        .eq('id', quoteJSON.productId)
                        .single();
                    product = productData;
                }

                // Get latest message
                const latestMessage = await QuoteMessage.findOne({
                    where: { quoteId: quote.id },
                    order: [['createdAt', 'DESC']],
                    attributes: ['id', 'message', 'createdAt', 'isRead']
                });

                // Calculate unread message count
                const unreadCount = await QuoteMessage.count({
                    where: {
                        quoteId: quote.id,
                        receiverId: buyerId,
                        isRead: false
                    }
                });

                return {
                    ...quoteJSON,
                    supplier: supplier ? {
                        id: supplier.id,
                        firstName: supplier.first_name,
                        lastName: supplier.last_name,
                        email: supplier.business_email,
                        companyName: supplier.company_name,
                        phone: supplier.mobile
                    } : null,
                    product: product ? {
                        id: product.id,
                        name: product.name,
                        sku: product.sku,
                        imageUrl: product.image_url
                    } : null,
                    messages: latestMessage ? [latestMessage.toJSON()] : [],
                    unreadMessageCount: unreadCount
                };
            })
        );

        res.json({
            success: true,
            data: {
                items: quotesWithDetails,
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalPages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
        console.error('Error fetching quotes:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch quotes',
            error: error.message
        });
    }
};

/**
 * Get a specific quote by ID with full details
 */
exports.getQuoteById = async (req, res) => {
    try {
        const buyerId = req.user.id;
        const { id } = req.params;

        const quote = await Quote.findOne({
            where: { id },
            include: [
                {
                    model: RFQ,
                    as: 'rfq',
                    where: { buyerId },
                    include: [
                        {
                            model: User,
                            as: 'buyer',
                            attributes: ['id', 'firstName', 'lastName', 'email', 'companyName']
                        }
                    ]
                },
                {
                    model: User,
                    as: 'supplier',
                    attributes: ['id', 'firstName', 'lastName', 'email', 'companyName', 'phone', 'profileImage']
                },
                {
                    model: Product,
                    as: 'product',
                    required: false,
                    attributes: ['id', 'name', 'sku', 'description', 'imageUrl', 'price']
                },
                {
                    model: QuoteMessage,
                    as: 'messages',
                    order: [['createdAt', 'ASC']],
                    include: [
                        {
                            model: User,
                            as: 'sender',
                            attributes: ['id', 'firstName', 'lastName', 'companyName']
                        },
                        {
                            model: User,
                            as: 'receiver',
                            attributes: ['id', 'firstName', 'lastName', 'companyName']
                        }
                    ]
                }
            ]
        });

        if (!quote) {
            return res.status(404).json({
                success: false,
                message: 'Quote not found or access denied'
            });
        }

        // Mark unread messages as read
        await QuoteMessage.update(
            { isRead: true },
            {
                where: {
                    quoteId: id,
                    receiverId: buyerId,
                    isRead: false
                }
            }
        );

        res.json({
            success: true,
            data: quote
        });
    } catch (error) {
        console.error('Error fetching quote:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch quote',
            error: error.message
        });
    }
};

/**
 * Accept a quote
 */
exports.acceptQuote = async (req, res) => {
    const { sequelize } = require('../config/database');
    const transaction = await sequelize.transaction();

    try {
        const buyerId = req.user.id;
        const { id } = req.params;
        const { createOrder = false, shippingAddressId, notes } = req.body;

        // Find quote with RFQ
        const quote = await Quote.findOne({
            where: { id },
            include: [
                {
                    model: RFQ,
                    as: 'rfq',
                    where: { buyerId }
                }
            ],
            transaction
        });

        if (!quote) {
            await transaction.rollback();
            return res.status(404).json({
                success: false,
                message: 'Quote not found or access denied'
            });
        }

        // Check if quote is still valid
        if (quote.status !== 'pending') {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                message: `Cannot accept quote with status: ${quote.status}`
            });
        }

        if (new Date(quote.validUntil) < new Date()) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                message: 'Quote has expired'
            });
        }

        // Update quote status (removed buyerNotes as it doesn't exist in schema)
        await quote.update({
            status: 'accepted',
            acceptedAt: new Date()
        }, { transaction });

        // If createOrder is true, create an order
        let order = null;
        if (createOrder) {
            // Create order (using snake_case field names for Supabase)
            order = await Order.create({
                user_id: buyerId,
                order_number: `ORD-${Date.now()}`,
                status: 'pending',
                payment_status: 'pending',
                items_subtotal: quote.quotePrice * quote.quantity,
                gst_amount: (quote.quotePrice * quote.quantity) * 0.18, // 18% GST
                shipping_charges: 0,
                platform_fee: 0,
                total_amount: (quote.quotePrice * quote.quantity) * 1.18,
                shipping_address: shippingAddressId ? { address_id: shippingAddressId } : {},
                order_notes: notes || null
            });

            // Create order item using createBulk (using snake_case field names)
            await OrderItem.createBulk([{
                order_id: order.id,
                product_id: quote.productId,
                supplier_id: quote.supplierId,
                product_title: 'Quote Product', // You might want to fetch this from products table
                unit_price: quote.quotePrice,
                discount_percent: 0,
                discount_amount: 0,
                final_price: quote.quotePrice,
                quantity: quote.quantity,
                subtotal: quote.quotePrice * quote.quantity,
                gst_percent: 18,
                gst_amount: (quote.quotePrice * quote.quantity) * 0.18,
                item_status: 'pending'
            }]);

            // Update RFQ status to fulfilled
            await quote.rfq.update({ status: 'fulfilled' }, { transaction });
        }

        // Commit transaction before sending email (email is non-critical)
        await transaction.commit();

        // Send quote accepted email to supplier (non-blocking)
        try {
            const { data: supplier } = await supabase
                .from('users')
                .select('first_name, last_name, business_email')
                .eq('id', quote.supplierId)
                .single();

            const { data: buyer } = await supabase
                .from('users')
                .select('first_name, last_name, company_name')
                .eq('id', buyerId)
                .single();

            if (supplier && supplier.business_email) {
                await emailService.sendQuoteAccepted(supplier.business_email, {
                    supplierName: `${supplier.first_name} ${supplier.last_name}`,
                    quoteNumber: quote.quoteNumber,
                    rfqTitle: quote.rfq.title,
                    buyerCompany: buyer?.company_name || `${buyer?.first_name} ${buyer?.last_name}`,
                    quotePrice: quote.quotePrice,
                    orderCreated: createOrder,
                    orderNumber: order?.order_number
                });
            }
        } catch (emailError) {
            console.error('Error sending quote accepted email:', emailError);
            // Don't fail the request if email fails
        }

        res.json({
            success: true,
            message: 'Quote accepted successfully',
            data: {
                quote: await quote.reload({
                    include: [
                        { model: RFQ, as: 'rfq' }
                    ]
                }),
                order
            }
        });
    } catch (error) {
        await transaction.rollback();
        console.error('Error accepting quote:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to accept quote',
            error: error.message
        });
    }
};

/**
 * Reject a quote
 */
exports.rejectQuote = async (req, res) => {
    try {
        const buyerId = req.user.id;
        const { id } = req.params;
        const { reason } = req.body;

        // Find quote with RFQ
        const quote = await Quote.findOne({
            where: { id },
            include: [
                {
                    model: RFQ,
                    as: 'rfq',
                    where: { buyerId }
                }
            ]
        });

        if (!quote) {
            return res.status(404).json({
                success: false,
                message: 'Quote not found or access denied'
            });
        }

        if (quote.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: `Cannot reject quote with status: ${quote.status}`
            });
        }

        // Update quote status
        await quote.update({
            status: 'rejected',
            rejectionReason: reason
        });

        // Send quote rejected email to supplier (non-blocking)
        try {
            const { data: supplier } = await supabase
                .from('users')
                .select('first_name, last_name, business_email')
                .eq('id', quote.supplierId)
                .single();

            const { data: buyer } = await supabase
                .from('users')
                .select('first_name, last_name, company_name')
                .eq('id', buyerId)
                .single();

            if (supplier && supplier.business_email) {
                await emailService.sendQuoteRejected(supplier.business_email, {
                    supplierName: `${supplier.first_name} ${supplier.last_name}`,
                    quoteNumber: quote.quoteNumber,
                    rfqTitle: quote.rfq.title,
                    buyerCompany: buyer?.company_name || `${buyer?.first_name} ${buyer?.last_name}`,
                    rejectionReason: reason
                });
            }
        } catch (emailError) {
            console.error('Error sending quote rejected email:', emailError);
            // Don't fail the request if email fails
        }

        res.json({
            success: true,
            message: 'Quote rejected successfully',
            data: quote
        });
    } catch (error) {
        console.error('Error rejecting quote:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reject quote',
            error: error.message
        });
    }
};

/**
 * Send a message about a quote
 */
exports.sendMessage = async (req, res) => {
    try {
        const buyerId = req.user.id;
        const { id } = req.params;
        const { message, attachments } = req.body;

        if (!message || message.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Message cannot be empty'
            });
        }

        // Find quote with RFQ to verify access
        const quote = await Quote.findOne({
            where: { id },
            include: [
                {
                    model: RFQ,
                    as: 'rfq',
                    where: { buyerId }
                }
            ]
        });

        if (!quote) {
            return res.status(404).json({
                success: false,
                message: 'Quote not found or access denied'
            });
        }

        // Create message
        const quoteMessage = await QuoteMessage.create({
            quoteId: id,
            senderId: buyerId,
            receiverId: quote.supplierId,
            message: message.trim(),
            attachments: attachments || []
        });

        // Send notification to supplier
        await Notification.create({
            user_id: quote.supplierId,
            type: 'quote_message',
            title: 'New Message',
            message: `You have a new message about quote ${quote.quoteNumber}`,
            data: { quoteId: quote.id, messageId: quoteMessage.id }
        });

        // Load message with sender info
        const messageWithSender = await QuoteMessage.findByPk(quoteMessage.id, {
            include: [
                {
                    model: User,
                    as: 'sender',
                    attributes: ['id', 'firstName', 'lastName', 'companyName']
                }
            ]
        });

        res.json({
            success: true,
            message: 'Message sent successfully',
            data: messageWithSender
        });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send message',
            error: error.message
        });
    }
};

/**
 * Get all messages for a quote
 */
exports.getQuoteMessages = async (req, res) => {
    try {
        const buyerId = req.user.id;
        const { id } = req.params;

        // Verify access to quote
        const quote = await Quote.findOne({
            where: { id },
            include: [
                {
                    model: RFQ,
                    as: 'rfq',
                    where: { buyerId }
                }
            ]
        });

        if (!quote) {
            return res.status(404).json({
                success: false,
                message: 'Quote not found or access denied'
            });
        }

        // Get messages
        const messages = await QuoteMessage.findAll({
            where: { quoteId: id },
            include: [
                {
                    model: User,
                    as: 'sender',
                    attributes: ['id', 'firstName', 'lastName', 'companyName']
                },
                {
                    model: User,
                    as: 'receiver',
                    attributes: ['id', 'firstName', 'lastName', 'companyName']
                }
            ],
            order: [['createdAt', 'ASC']]
        });

        // Mark unread messages as read
        await QuoteMessage.update(
            { isRead: true },
            {
                where: {
                    quoteId: id,
                    receiverId: buyerId,
                    isRead: false
                }
            }
        );

        res.json({
            success: true,
            data: messages
        });
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch messages',
            error: error.message
        });
    }
};

/**
 * Get quote statistics for dashboard
 */
exports.getQuoteStats = async (req, res) => {
    try {
        const buyerId = req.user.id;

        // Get all quotes for buyer's RFQs
        const totalQuotes = await Quote.count({
            include: [
                {
                    model: RFQ,
                    as: 'rfq',
                    where: { buyerId }
                }
            ]
        });

        const pendingQuotes = await Quote.count({
            where: { status: 'pending' },
            include: [
                {
                    model: RFQ,
                    as: 'rfq',
                    where: { buyerId }
                }
            ]
        });

        const acceptedQuotes = await Quote.count({
            where: { status: 'accepted' },
            include: [
                {
                    model: RFQ,
                    as: 'rfq',
                    where: { buyerId }
                }
            ]
        });

        const rejectedQuotes = await Quote.count({
            where: { status: 'rejected' },
            include: [
                {
                    model: RFQ,
                    as: 'rfq',
                    where: { buyerId }
                }
            ]
        });

        // Get unread message count
        const unreadMessages = await QuoteMessage.count({
            where: {
                receiverId: buyerId,
                isRead: false
            }
        });

        // Get average quote response time (in hours)
        const quotes = await Quote.findAll({
            attributes: ['createdAt'],
            include: [
                {
                    model: RFQ,
                    as: 'rfq',
                    where: { buyerId },
                    attributes: ['createdAt']
                }
            ]
        });

        let avgResponseTime = 0;
        if (quotes.length > 0) {
            const totalResponseTime = quotes.reduce((sum, quote) => {
                const rfqTime = new Date(quote.rfq.createdAt);
                const quoteTime = new Date(quote.createdAt);
                const diffHours = (quoteTime - rfqTime) / (1000 * 60 * 60);
                return sum + diffHours;
            }, 0);
            avgResponseTime = Math.round(totalResponseTime / quotes.length);
        }

        res.json({
            success: true,
            data: {
                totalQuotes,
                pendingQuotes,
                acceptedQuotes,
                rejectedQuotes,
                unreadMessages,
                avgResponseTime
            }
        });
    } catch (error) {
        console.error('Error fetching quote stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch quote statistics',
            error: error.message
        });
    }
};

/**
 * Mark messages as read
 */
exports.markMessagesAsRead = async (req, res) => {
    try {
        const buyerId = req.user.id;
        const { id } = req.params;

        // Verify access to quote
        const quote = await Quote.findOne({
            where: { id },
            include: [
                {
                    model: RFQ,
                    as: 'rfq',
                    where: { buyerId }
                }
            ]
        });

        if (!quote) {
            return res.status(404).json({
                success: false,
                message: 'Quote not found or access denied'
            });
        }

        // Mark all messages as read
        const [updated] = await QuoteMessage.update(
            { isRead: true },
            {
                where: {
                    quoteId: id,
                    receiverId: buyerId,
                    isRead: false
                }
            }
        );

        res.json({
            success: true,
            message: `Marked ${updated} messages as read`
        });
    } catch (error) {
        console.error('Error marking messages as read:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark messages as read',
            error: error.message
        });
    }
};
