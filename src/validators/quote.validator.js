const Joi = require('joi');

/**
 * Validation schema for accepting a quote
 */
exports.acceptQuoteSchema = Joi.object({
    createOrder: Joi.boolean()
        .default(false)
        .messages({
            'boolean.base': 'createOrder must be a boolean'
        }),

    shippingAddressId: Joi.string()
        .uuid()
        .when('createOrder', {
            is: true,
            then: Joi.required(),
            otherwise: Joi.optional()
        })
        .messages({
            'string.guid': 'Invalid shipping address ID format',
            'any.required': 'Shipping address is required when creating an order'
        }),

    notes: Joi.string()
        .max(1000)
        .allow('')
        .trim()
        .messages({
            'string.max': 'Notes must not exceed 1000 characters'
        })
});

/**
 * Validation schema for rejecting a quote
 */
exports.rejectQuoteSchema = Joi.object({
    reason: Joi.string()
        .min(10)
        .max(1000)
        .required()
        .trim()
        .messages({
            'string.empty': 'Rejection reason is required',
            'string.min': 'Reason must be at least 10 characters long',
            'string.max': 'Reason must not exceed 1000 characters',
            'any.required': 'Rejection reason is required'
        })
});

/**
 * Validation schema for sending a quote message
 */
exports.sendMessageSchema = Joi.object({
    message: Joi.string()
        .min(1)
        .max(2000)
        .required()
        .trim()
        .messages({
            'string.empty': 'Message is required',
            'string.min': 'Message cannot be empty',
            'string.max': 'Message must not exceed 2000 characters',
            'any.required': 'Message is required'
        }),

    attachments: Joi.array()
        .items(
            Joi.object({
                fileName: Joi.string().required(),
                fileUrl: Joi.string().uri().required(),
                fileSize: Joi.number().integer().min(0),
                fileType: Joi.string()
            })
        )
        .max(5)
        .messages({
            'array.max': 'Maximum 5 attachments allowed per message'
        })
});

/**
 * Validation schema for quote query parameters
 */
exports.queryQuotesSchema = Joi.object({
    page: Joi.number()
        .integer()
        .min(1)
        .default(1),

    limit: Joi.number()
        .integer()
        .min(1)
        .max(100)
        .default(10),

    status: Joi.string()
        .valid('pending', 'accepted', 'rejected', 'expired')
        .messages({
            'any.only': 'Invalid status value'
        }),

    rfqId: Joi.string()
        .uuid()
        .messages({
            'string.guid': 'Invalid RFQ ID format'
        }),

    search: Joi.string()
        .max(200)
        .trim(),

    sortBy: Joi.string()
        .valid('createdAt', 'updatedAt', 'quotePrice', 'deliveryDays', 'validUntil')
        .default('createdAt'),

    sortOrder: Joi.string()
        .valid('ASC', 'DESC')
        .default('DESC')
});

/**
 * Validation schema for UUID parameters
 */
exports.uuidParamSchema = Joi.object({
    id: Joi.string()
        .uuid()
        .required()
        .messages({
            'string.guid': 'Invalid ID format',
            'any.required': 'ID is required'
        })
});

/**
 * Middleware to validate request body
 */
exports.validateBody = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body, {
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

        req.body = value;
        next();
    };
};

/**
 * Middleware to validate query parameters
 */
exports.validateQuery = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.query, {
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

        req.query = value;
        next();
    };
};

/**
 * Middleware to validate URL parameters
 */
exports.validateParams = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.params, {
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

        req.params = value;
        next();
    };
};
