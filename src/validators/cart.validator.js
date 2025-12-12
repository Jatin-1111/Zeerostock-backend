const Joi = require('joi');

/**
 * Cart Validation Schemas
 */

// Add to cart validation
const addToCart = Joi.object({
    productId: Joi.string()
        .uuid()
        .required()
        .messages({
            'string.guid': 'Invalid product ID format',
            'any.required': 'Product ID is required'
        }),

    quantity: Joi.number()
        .integer()
        .min(1)
        .max(10000)
        .default(1)
        .messages({
            'number.base': 'Quantity must be a number',
            'number.min': 'Quantity must be at least 1',
            'number.max': 'Quantity cannot exceed 10,000 units'
        })
});

// Update cart item validation
const updateCartItem = Joi.object({
    quantity: Joi.number()
        .integer()
        .min(1)
        .max(10000)
        .required()
        .messages({
            'number.base': 'Quantity must be a number',
            'number.min': 'Quantity must be at least 1',
            'number.max': 'Quantity cannot exceed 10,000 units',
            'any.required': 'Quantity is required'
        })
});

// Apply coupon validation
const applyCoupon = Joi.object({
    couponCode: Joi.string()
        .uppercase()
        .trim()
        .min(3)
        .max(50)
        .required()
        .messages({
            'string.base': 'Coupon code must be a string',
            'string.min': 'Coupon code must be at least 3 characters',
            'string.max': 'Coupon code cannot exceed 50 characters',
            'any.required': 'Coupon code is required'
        })
});

// Shipping estimate validation
const shippingEstimate = Joi.object({
    state: Joi.string()
        .trim()
        .required()
        .messages({
            'any.required': 'State is required for shipping estimate'
        }),

    city: Joi.string()
        .trim()
        .optional(),

    pincode: Joi.string()
        .pattern(/^[0-9]{6}$/)
        .optional()
        .messages({
            'string.pattern.base': 'Invalid pincode format. Must be 6 digits'
        }),

    orderValue: Joi.number()
        .min(0)
        .optional()
        .messages({
            'number.min': 'Order value cannot be negative'
        })
});

// Checkout session validation
const createCheckout = Joi.object({
    shippingAddress: Joi.object({
        fullName: Joi.string()
            .trim()
            .min(2)
            .max(100)
            .required()
            .messages({
                'any.required': 'Full name is required'
            }),

        phone: Joi.string()
            .pattern(/^[6-9]\d{9}$/)
            .required()
            .messages({
                'string.pattern.base': 'Invalid phone number format',
                'any.required': 'Phone number is required'
            }),

        email: Joi.string()
            .email()
            .optional(),

        addressLine1: Joi.string()
            .trim()
            .min(5)
            .max(200)
            .required()
            .messages({
                'any.required': 'Address line 1 is required',
                'string.min': 'Address must be at least 5 characters'
            }),

        addressLine2: Joi.string()
            .trim()
            .max(200)
            .optional(),

        landmark: Joi.string()
            .trim()
            .max(100)
            .optional(),

        city: Joi.string()
            .trim()
            .required()
            .messages({
                'any.required': 'City is required'
            }),

        state: Joi.string()
            .trim()
            .required()
            .messages({
                'any.required': 'State is required'
            }),

        pincode: Joi.string()
            .pattern(/^[0-9]{6}$/)
            .required()
            .messages({
                'string.pattern.base': 'Invalid pincode format. Must be 6 digits',
                'any.required': 'Pincode is required'
            }),

        country: Joi.string()
            .trim()
            .default('India'),

        addressType: Joi.string()
            .valid('office', 'warehouse', 'factory', 'other')
            .default('office')
    }).required().messages({
        'any.required': 'Shipping address is required'
    }),

    billingAddress: Joi.object({
        fullName: Joi.string().trim().min(2).max(100).required(),
        phone: Joi.string().pattern(/^[6-9]\d{9}$/).required(),
        email: Joi.string().email().optional(),
        addressLine1: Joi.string().trim().min(5).max(200).required(),
        addressLine2: Joi.string().trim().max(200).optional(),
        landmark: Joi.string().trim().max(100).optional(),
        city: Joi.string().trim().required(),
        state: Joi.string().trim().required(),
        pincode: Joi.string().pattern(/^[0-9]{6}$/).required(),
        country: Joi.string().trim().default('India'),
        gstNumber: Joi.string()
            .pattern(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)
            .optional()
            .messages({
                'string.pattern.base': 'Invalid GST number format'
            })
    }).optional(),

    sameAsShipping: Joi.boolean().default(true),

    notes: Joi.string()
        .trim()
        .max(500)
        .optional()
});

/**
 * Validation middleware factory
 */
const validate = (schema) => {
    return (req, res, next) => {
        const dataToValidate = req.method === 'GET' ? req.query : req.body;

        const { error, value } = schema.validate(dataToValidate, {
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
                message: 'Validation error',
                errors
            });
        }

        // Replace request data with validated data
        if (req.method === 'GET') {
            req.query = value;
        } else {
            req.body = value;
        }

        next();
    };
};

module.exports = {
    validate,
    cartValidation: {
        addToCart,
        updateCartItem,
        applyCoupon,
        shippingEstimate,
        createCheckout
    }
};
