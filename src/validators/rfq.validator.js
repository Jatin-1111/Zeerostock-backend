const Joi = require('joi');

/**
 * Validation schema for creating an RFQ
 */
exports.createRFQSchema = Joi.object({
    title: Joi.string()
        .min(5)
        .max(200)
        .required()
        .trim()
        .messages({
            'string.empty': 'Title is required',
            'string.min': 'Title must be at least 5 characters long',
            'string.max': 'Title must not exceed 200 characters',
            'any.required': 'Title is required'
        }),

    categoryId: Joi.string()
        .uuid()
        .required()
        .messages({
            'string.empty': 'Category is required',
            'string.guid': 'Invalid category ID format',
            'any.required': 'Category is required'
        }),

    industryId: Joi.string()
        .uuid()
        .required()
        .messages({
            'string.empty': 'Industry is required',
            'string.guid': 'Invalid industry ID format',
            'any.required': 'Industry is required'
        }),

    quantity: Joi.number()
        .integer()
        .min(1)
        .required()
        .messages({
            'number.base': 'Quantity must be a number',
            'number.min': 'Quantity must be at least 1',
            'any.required': 'Quantity is required'
        }),

    unit: Joi.string()
        .valid('pieces', 'kg', 'lbs', 'tons', 'liters', 'gallons', 'meters', 'feet', 'boxes', 'pallets', 'other')
        .required()
        .messages({
            'string.empty': 'Unit is required',
            'any.only': 'Invalid unit type',
            'any.required': 'Unit is required'
        }),

    budgetMin: Joi.number()
        .min(0)
        .when('budgetMax', {
            is: Joi.exist(),
            then: Joi.number().max(Joi.ref('budgetMax')),
            otherwise: Joi.number()
        })
        .allow(null)
        .messages({
            'number.base': 'Minimum budget must be a number',
            'number.min': 'Minimum budget cannot be negative',
            'number.max': 'Minimum budget must be less than maximum budget'
        }),

    budgetMax: Joi.number()
        .min(0)
        .allow(null)
        .messages({
            'number.base': 'Maximum budget must be a number',
            'number.min': 'Maximum budget cannot be negative'
        }),

    detailedRequirements: Joi.string()
        .max(5000)
        .allow('')
        .trim()
        .messages({
            'string.max': 'Requirements must not exceed 5000 characters'
        }),

    preferredLocation: Joi.string()
        .max(200)
        .allow('')
        .trim()
        .messages({
            'string.max': 'Preferred location must not exceed 200 characters'
        }),

    durationDays: Joi.number()
        .integer()
        .min(1)
        .max(365)
        .default(30)
        .messages({
            'number.base': 'Duration must be a number',
            'number.min': 'Duration must be at least 1 day',
            'number.max': 'Duration must not exceed 365 days'
        }),

    preferredDeliveryDate: Joi.date()
        .min('now')
        .allow(null)
        .messages({
            'date.base': 'Invalid delivery date format',
            'date.min': 'Delivery date cannot be in the past'
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
        .max(10)
        .messages({
            'array.max': 'Maximum 10 attachments allowed'
        })
});

/**
 * Validation schema for updating an RFQ
 */
exports.updateRFQSchema = Joi.object({
    title: Joi.string()
        .min(5)
        .max(200)
        .trim()
        .messages({
            'string.min': 'Title must be at least 5 characters long',
            'string.max': 'Title must not exceed 200 characters'
        }),

    categoryId: Joi.string()
        .uuid()
        .messages({
            'string.guid': 'Invalid category ID format'
        }),

    industryId: Joi.string()
        .uuid()
        .messages({
            'string.guid': 'Invalid industry ID format'
        }),

    quantity: Joi.number()
        .integer()
        .min(1)
        .messages({
            'number.base': 'Quantity must be a number',
            'number.min': 'Quantity must be at least 1'
        }),

    unit: Joi.string()
        .valid('pieces', 'kg', 'lbs', 'tons', 'liters', 'gallons', 'meters', 'feet', 'boxes', 'pallets', 'other')
        .messages({
            'any.only': 'Invalid unit type'
        }),

    budgetMin: Joi.number()
        .min(0)
        .allow(null)
        .messages({
            'number.base': 'Minimum budget must be a number',
            'number.min': 'Minimum budget cannot be negative'
        }),

    budgetMax: Joi.number()
        .min(0)
        .allow(null)
        .messages({
            'number.base': 'Maximum budget must be a number',
            'number.min': 'Maximum budget cannot be negative'
        }),

    detailedRequirements: Joi.string()
        .max(5000)
        .allow('')
        .trim()
        .messages({
            'string.max': 'Requirements must not exceed 5000 characters'
        }),

    preferredLocation: Joi.string()
        .max(200)
        .allow('')
        .trim()
        .messages({
            'string.max': 'Preferred location must not exceed 200 characters'
        }),

    durationDays: Joi.number()
        .integer()
        .min(1)
        .max(365)
        .messages({
            'number.base': 'Duration must be a number',
            'number.min': 'Duration must be at least 1 day',
            'number.max': 'Duration must not exceed 365 days'
        }),

    requiredByDate: Joi.date()
        .min('now')
        .allow(null, '')
        .messages({
            'date.base': 'Invalid delivery date format',
            'date.min': 'Delivery date cannot be in the past'
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
        .max(10)
        .messages({
            'array.max': 'Maximum 10 attachments allowed'
        })
}).min(1).messages({
    'object.min': 'At least one field must be provided for update'
});

/**
 * Validation schema for RFQ query parameters
 */
exports.queryRFQsSchema = Joi.object({
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
        .valid('active', 'closed', 'expired', 'fulfilled')
        .messages({
            'any.only': 'Invalid status value'
        }),

    category: Joi.string()
        .uuid()
        .messages({
            'string.guid': 'Invalid category ID format'
        }),

    industry: Joi.string()
        .uuid()
        .messages({
            'string.guid': 'Invalid industry ID format'
        }),

    search: Joi.string()
        .max(200)
        .trim(),

    sortBy: Joi.string()
        .valid('createdAt', 'updatedAt', 'expiresAt', 'quoteCount')
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
