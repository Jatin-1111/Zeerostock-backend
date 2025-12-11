const Joi = require('joi');

/**
 * Homepage Validation Schemas
 * Validates query parameters for homepage APIs
 */

const homepageValidation = {
    /**
     * Pagination validation
     */
    pagination: Joi.object({
        limit: Joi.number()
            .integer()
            .min(1)
            .max(100)
            .default(12)
            .messages({
                'number.base': 'Limit must be a number',
                'number.min': 'Limit must be at least 1',
                'number.max': 'Limit cannot exceed 100'
            }),

        page: Joi.number()
            .integer()
            .min(1)
            .default(1)
            .messages({
                'number.base': 'Page must be a number',
                'number.min': 'Page must be at least 1'
            })
    }),

    /**
     * Trending categories validation
     */
    trendingCategories: Joi.object({
        limit: Joi.number()
            .integer()
            .min(1)
            .max(50)
            .default(10)
            .messages({
                'number.max': 'Limit cannot exceed 50'
            })
    }),

    /**
     * Featured deals validation
     */
    featuredDeals: Joi.object({
        limit: Joi.number()
            .integer()
            .min(1)
            .max(100)
            .default(12),

        category: Joi.string()
            .uuid()
            .optional()
            .messages({
                'string.guid': 'Invalid category ID format'
            }),

        city: Joi.string()
            .max(255)
            .optional()
    }),

    /**
     * Live auctions validation
     */
    liveAuctions: Joi.object({
        limit: Joi.number()
            .integer()
            .min(1)
            .max(100)
            .default(12),

        sortBy: Joi.string()
            .valid('ending_soon', 'most_bids', 'highest_bid', 'newest')
            .default('ending_soon')
            .messages({
                'any.only': 'Invalid sort option'
            })
    }),

    /**
     * Trending products validation
     */
    trendingProducts: Joi.object({
        limit: Joi.number()
            .integer()
            .min(1)
            .max(100)
            .default(12),

        category: Joi.string()
            .uuid()
            .optional()
    }),

    /**
     * Market insights validation
     */
    marketInsights: Joi.object({
        includeTrends: Joi.boolean()
            .default(true),

        topCategoriesLimit: Joi.number()
            .integer()
            .min(3)
            .max(10)
            .default(5)
    }),

    /**
     * Case studies validation
     */
    caseStudies: Joi.object({
        limit: Joi.number()
            .integer()
            .min(1)
            .max(50)
            .default(12),

        industry: Joi.string()
            .max(255)
            .optional(),

        featured: Joi.boolean()
            .optional()
    }),

    /**
     * Testimonials validation
     */
    testimonials: Joi.object({
        limit: Joi.number()
            .integer()
            .min(1)
            .max(50)
            .default(12),

        featured: Joi.boolean()
            .optional(),

        minRating: Joi.number()
            .min(1)
            .max(5)
            .optional()
            .messages({
                'number.min': 'Minimum rating must be at least 1',
                'number.max': 'Maximum rating is 5'
            })
    }),

    /**
     * Combined homepage validation
     */
    combined: Joi.object({
        sections: Joi.string()
            .pattern(/^[a-z,_]+$/)
            .optional()
            .messages({
                'string.pattern.base': 'Invalid sections format. Use comma-separated values like: hero_banners,trending_categories'
            }),

        compact: Joi.boolean()
            .default(false)
            .messages({
                'boolean.base': 'Compact must be a boolean value'
            })
    })
};

/**
 * Validation middleware factory for query parameters
 */
const validateQuery = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.query, {
            abortEarly: false,
            stripUnknown: true,
            convert: true
        });

        if (error) {
            const errors = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }));

            return res.status(400).json({
                success: false,
                message: 'Invalid query parameters',
                errors,
                errorCode: 'VALIDATION_ERROR'
            });
        }

        req.validatedQuery = value;
        next();
    };
};

module.exports = {
    homepageValidation,
    validateQuery
};
