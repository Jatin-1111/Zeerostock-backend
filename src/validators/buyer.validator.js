const Joi = require('joi');

/**
 * Buyer Account Validators
 * Validation schemas for all buyer account menu APIs
 */

const buyerValidation = {
    // =====================================================
    // ORDERS VALIDATORS
    // =====================================================
    getOrdersQuery: Joi.object({
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(50).default(10),
        status: Joi.string().valid(
            'pending', 'confirmed', 'processing', 'shipped',
            'delivered', 'cancelled', 'refunded', 'failed'
        ).optional()
    }),

    orderIdParam: Joi.object({
        orderId: Joi.string().uuid().required().messages({
            'string.guid': 'Invalid order ID format'
        })
    }),

    cancelOrder: Joi.object({
        reason: Joi.string().min(10).max(500).required().messages({
            'string.empty': 'Cancellation reason is required',
            'string.min': 'Reason must be at least 10 characters',
            'string.max': 'Reason cannot exceed 500 characters'
        })
    }),

    createOrder: Joi.object({
        checkoutSessionId: Joi.string().uuid().required().messages({
            'string.guid': 'Invalid checkout session ID format',
            'string.empty': 'Checkout session ID is required'
        }),
        shippingAddressId: Joi.string().uuid().required().messages({
            'string.guid': 'Invalid shipping address ID format',
            'string.empty': 'Shipping address is required'
        }),
        billingAddressId: Joi.string().uuid().optional().allow('', null).messages({
            'string.guid': 'Invalid billing address ID format'
        }),
        paymentMethod: Joi.string().valid('cod', 'online', 'upi').required().messages({
            'any.only': 'Payment method must be one of: cod, online, upi',
            'string.empty': 'Payment method is required'
        }),
        paymentDetails: Joi.object({
            transactionId: Joi.string().optional().allow('', null),
            upiId: Joi.string().optional().allow('', null),
            cardLast4: Joi.string().optional().allow('', null)
        }).optional().allow(null),
        orderNotes: Joi.string().max(500).optional().allow('', null).messages({
            'string.max': 'Order notes cannot exceed 500 characters'
        })
    }),

    // =====================================================
    // WATCHLIST VALIDATORS
    // =====================================================
    addToWatchlist: Joi.object({
        productId: Joi.string().uuid().required().messages({
            'string.guid': 'Invalid product ID format',
            'string.empty': 'Product ID is required'
        }),
        notes: Joi.string().max(500).optional().allow('', null)
    }),

    removeFromWatchlist: Joi.object({
        productId: Joi.string().uuid().required().messages({
            'string.guid': 'Invalid product ID format'
        })
    }),

    watchlistQuery: Joi.object({
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(50).default(20)
    }),

    // =====================================================
    // RECENTLY VIEWED VALIDATORS
    // =====================================================
    addRecentlyViewed: Joi.object({
        productId: Joi.string().uuid().required().messages({
            'string.guid': 'Invalid product ID format',
            'string.empty': 'Product ID is required'
        })
    }),

    recentlyViewedQuery: Joi.object({
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(50).default(50)
    }),

    // =====================================================
    // REVIEWS VALIDATORS
    // =====================================================
    createReview: Joi.object({
        productId: Joi.string().uuid().required().messages({
            'string.guid': 'Invalid product ID format',
            'string.empty': 'Product ID is required'
        }),
        orderId: Joi.string().uuid().optional().allow('', null).messages({
            'string.guid': 'Invalid order ID format'
        }),
        rating: Joi.number().min(1).max(5).precision(1).required().messages({
            'number.base': 'Rating must be a number',
            'number.min': 'Rating must be at least 1',
            'number.max': 'Rating cannot exceed 5',
            'any.required': 'Rating is required'
        }),
        title: Joi.string().min(5).max(200).optional().allow('', null).messages({
            'string.min': 'Title must be at least 5 characters',
            'string.max': 'Title cannot exceed 200 characters'
        }),
        comment: Joi.string().min(10).max(2000).required().messages({
            'string.empty': 'Review comment is required',
            'string.min': 'Comment must be at least 10 characters',
            'string.max': 'Comment cannot exceed 2000 characters'
        }),
        images: Joi.array().items(Joi.string().uri()).max(5).optional().default([]).messages({
            'array.max': 'Maximum 5 images allowed'
        }),
        videos: Joi.array().items(Joi.string().uri()).max(2).optional().default([]).messages({
            'array.max': 'Maximum 2 videos allowed'
        })
    }),

    updateReview: Joi.object({
        rating: Joi.number().min(1).max(5).precision(1).optional().messages({
            'number.min': 'Rating must be at least 1',
            'number.max': 'Rating cannot exceed 5'
        }),
        title: Joi.string().min(5).max(200).optional().messages({
            'string.min': 'Title must be at least 5 characters',
            'string.max': 'Title cannot exceed 200 characters'
        }),
        comment: Joi.string().min(10).max(2000).optional().messages({
            'string.min': 'Comment must be at least 10 characters',
            'string.max': 'Comment cannot exceed 2000 characters'
        }),
        images: Joi.array().items(Joi.string().uri()).max(5).optional(),
        videos: Joi.array().items(Joi.string().uri()).max(2).optional()
    }),

    reviewsQuery: Joi.object({
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(50).default(10)
    }),

    reviewIdParam: Joi.object({
        reviewId: Joi.string().uuid().required().messages({
            'string.guid': 'Invalid review ID format'
        })
    }),

    markReviewHelpfulness: Joi.object({
        isHelpful: Joi.boolean().required().messages({
            'any.required': 'Helpfulness value is required'
        })
    }),

    // =====================================================
    // PROFILE VALIDATORS
    // =====================================================
    updateProfile: Joi.object({
        firstName: Joi.string().min(2).max(100).trim().optional().messages({
            'string.min': 'First name must be at least 2 characters',
            'string.max': 'First name cannot exceed 100 characters'
        }),
        lastName: Joi.string().min(2).max(100).trim().optional().messages({
            'string.min': 'Last name must be at least 2 characters',
            'string.max': 'Last name cannot exceed 100 characters'
        }),
        companyName: Joi.string().min(2).max(255).trim().optional().messages({
            'string.min': 'Company name must be at least 2 characters',
            'string.max': 'Company name cannot exceed 255 characters'
        }),
        businessType: Joi.string().valid(
            'manufacturer', 'wholesaler', 'retailer', 'distributor',
            'service_provider', 'other'
        ).optional(),
        gstNumber: Joi.string().pattern(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)
            .optional().allow('', null).messages({
                'string.pattern.base': 'Please provide a valid GST number'
            })
    }),

    changePassword: Joi.object({
        currentPassword: Joi.string().required().messages({
            'string.empty': 'Current password is required'
        }),
        newPassword: Joi.string()
            .pattern(/^(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{8,}$/)
            .required()
            .messages({
                'string.empty': 'New password is required',
                'string.pattern.base': 'Password must be at least 8 characters and contain at least one number and one special character'
            }),
        confirmPassword: Joi.string()
            .valid(Joi.ref('newPassword'))
            .required()
            .messages({
                'any.only': 'Passwords do not match',
                'string.empty': 'Confirm password is required'
            })
    }),

    // =====================================================
    // ADDRESS VALIDATORS
    // =====================================================
    addAddress: Joi.object({
        addressType: Joi.string().valid('shipping', 'billing', 'both').required().messages({
            'any.only': 'Address type must be shipping, billing, or both',
            'string.empty': 'Address type is required'
        }),
        label: Joi.string().max(100).optional().allow('', null).messages({
            'string.max': 'Label cannot exceed 100 characters'
        }),
        contactName: Joi.string().min(2).max(255).required().messages({
            'string.empty': 'Contact name is required',
            'string.min': 'Contact name must be at least 2 characters'
        }),
        contactPhone: Joi.string().pattern(/^[6-9]\d{9}$/).required().messages({
            'string.empty': 'Contact phone is required',
            'string.pattern.base': 'Please provide a valid 10-digit mobile number'
        }),
        addressLine1: Joi.string().min(5).max(500).required().messages({
            'string.empty': 'Address line 1 is required',
            'string.min': 'Address must be at least 5 characters'
        }),
        addressLine2: Joi.string().max(500).optional().allow('', null),
        landmark: Joi.string().max(255).optional().allow('', null),
        city: Joi.string().min(2).max(100).required().messages({
            'string.empty': 'City is required'
        }),
        state: Joi.string().min(2).max(100).required().messages({
            'string.empty': 'State is required'
        }),
        pincode: Joi.string().pattern(/^[1-9][0-9]{5}$/).required().messages({
            'string.empty': 'Pincode is required',
            'string.pattern.base': 'Please provide a valid 6-digit pincode'
        }),
        country: Joi.string().default('India'),
        isDefault: Joi.boolean().default(false)
    }),

    updateAddress: Joi.object({
        addressType: Joi.string().valid('shipping', 'billing', 'both').optional(),
        label: Joi.string().max(100).optional().allow('', null),
        contactName: Joi.string().min(2).max(255).optional(),
        contactPhone: Joi.string().pattern(/^[6-9]\d{9}$/).optional(),
        addressLine1: Joi.string().min(5).max(500).optional(),
        addressLine2: Joi.string().max(500).optional().allow('', null),
        landmark: Joi.string().max(255).optional().allow('', null),
        city: Joi.string().min(2).max(100).optional(),
        state: Joi.string().min(2).max(100).optional(),
        pincode: Joi.string().pattern(/^[1-9][0-9]{5}$/).optional(),
        country: Joi.string().optional(),
        isDefault: Joi.boolean().optional()
    }),

    addressIdParam: Joi.object({
        addressId: Joi.string().uuid().required().messages({
            'string.guid': 'Invalid address ID format'
        })
    }),

    // =====================================================
    // NOTIFICATIONS VALIDATORS
    // =====================================================
    notificationsQuery: Joi.object({
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(50).default(20),
        type: Joi.string().valid(
            'order_confirmed', 'order_shipped', 'order_delivered', 'order_cancelled',
            'payment_success', 'payment_failed', 'payment_refund',
            'auction_won', 'auction_lost', 'auction_outbid', 'auction_ending',
            'price_drop', 'back_in_stock', 'watchlist_update',
            'review_response', 'message_received',
            'system', 'promotion', 'account'
        ).optional(),
        unreadOnly: Joi.boolean().default(false)
    }),

    notificationIdParam: Joi.object({
        notificationId: Joi.string().uuid().required().messages({
            'string.guid': 'Invalid notification ID format'
        })
    }),

    markNotificationsRead: Joi.object({
        notificationIds: Joi.array().items(Joi.string().uuid()).min(1).optional().messages({
            'array.min': 'At least one notification ID is required'
        }),
        markAll: Joi.boolean().default(false)
    }),

    // =====================================================
    // SUPPORT TICKETS VALIDATORS
    // =====================================================
    createTicket: Joi.object({
        category: Joi.string().valid(
            'order_issue', 'payment_issue', 'product_quality', 'shipping_delay',
            'refund_request', 'account_issue', 'technical_issue', 'general_inquiry', 'other'
        ).required().messages({
            'any.only': 'Invalid ticket category',
            'string.empty': 'Ticket category is required'
        }),
        subject: Joi.string().min(5).max(255).required().messages({
            'string.empty': 'Subject is required',
            'string.min': 'Subject must be at least 5 characters',
            'string.max': 'Subject cannot exceed 255 characters'
        }),
        description: Joi.string().min(20).max(5000).required().messages({
            'string.empty': 'Description is required',
            'string.min': 'Description must be at least 20 characters',
            'string.max': 'Description cannot exceed 5000 characters'
        }),
        priority: Joi.string().valid('low', 'medium', 'high', 'urgent').default('medium'),
        orderId: Joi.string().uuid().optional().allow('', null).messages({
            'string.guid': 'Invalid order ID format'
        }),
        productId: Joi.string().uuid().optional().allow('', null).messages({
            'string.guid': 'Invalid product ID format'
        }),
        attachments: Joi.array().items(Joi.string().uri()).max(5).optional().default([]).messages({
            'array.max': 'Maximum 5 attachments allowed'
        })
    }),

    ticketsQuery: Joi.object({
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(50).default(10),
        status: Joi.string().valid('open', 'in_progress', 'waiting_customer', 'resolved', 'closed').optional()
    }),

    ticketIdParam: Joi.object({
        ticketId: Joi.string().uuid().required().messages({
            'string.guid': 'Invalid ticket ID format'
        })
    }),

    addTicketMessage: Joi.object({
        message: Joi.string().min(5).max(5000).required().messages({
            'string.empty': 'Message is required',
            'string.min': 'Message must be at least 5 characters',
            'string.max': 'Message cannot exceed 5000 characters'
        }),
        attachments: Joi.array().items(Joi.string().uri()).max(3).optional().default([])
    }),

    rateTicket: Joi.object({
        rating: Joi.number().integer().min(1).max(5).required().messages({
            'number.base': 'Rating must be a number',
            'number.min': 'Rating must be at least 1',
            'number.max': 'Rating cannot exceed 5',
            'any.required': 'Rating is required'
        }),
        feedback: Joi.string().max(1000).optional().allow('', null).messages({
            'string.max': 'Feedback cannot exceed 1000 characters'
        })
    })
};

/**
 * Validation middleware factory
 * @param {Joi.Schema} schema - Joi validation schema
 * @param {string} property - Request property to validate ('body', 'query', 'params')
 */
const validate = (schema, property = 'body') => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req[property], {
            abortEarly: false,
            stripUnknown: true
        });

        if (error) {
            const errors = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }));

            return res.status(400).json({
                success: false,
                errorCode: 'VALIDATION_ERROR',
                message: 'Validation failed',
                errors
            });
        }

        req[property] = value;
        next();
    };
};

module.exports = {
    buyerValidation,
    validate
};
