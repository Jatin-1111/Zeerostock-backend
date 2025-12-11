const Joi = require('joi');

/**
 * Marketplace Validation Schemas
 * Validates all query parameters for marketplace APIs
 */

// Common pagination schema
const paginationSchema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20)
});

// Product filters validation
const productsFiltersSchema = Joi.object({
    // Pagination
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),

    // Category & Industry
    categoryId: Joi.string().uuid(),
    industryId: Joi.string().uuid(),

    // Price filters
    minPrice: Joi.number().min(0),
    maxPrice: Joi.number().min(0),

    // Condition filter
    condition: Joi.alternatives().try(
        Joi.string().valid('new', 'like-new', 'good', 'fair'),
        Joi.array().items(Joi.string().valid('new', 'like-new', 'good', 'fair'))
    ),

    // Listing type filter
    listingType: Joi.alternatives().try(
        Joi.string().valid('auction', 'fixed', 'negotiable'),
        Joi.array().items(Joi.string().valid('auction', 'fixed', 'negotiable'))
    ),

    // Supplier verification
    verified: Joi.boolean(),

    // Location filter
    city: Joi.string().max(100),

    // Discount filters
    minDiscount: Joi.number().min(0).max(100),
    maxDiscount: Joi.number().min(0).max(100),

    // Search query
    q: Joi.string().max(200),

    // Sorting
    sort: Joi.string().valid(
        'relevance',
        'price-asc',
        'price-desc',
        'newest',
        'views',
        'ending-soon',
        'rating',
        'discount'
    ).default('relevance')
}).custom((value, helpers) => {
    // Validate that maxPrice >= minPrice
    if (value.minPrice && value.maxPrice && value.maxPrice < value.minPrice) {
        return helpers.error('custom.priceRange');
    }

    // Validate that maxDiscount >= minDiscount
    if (value.minDiscount && value.maxDiscount && value.maxDiscount < value.minDiscount) {
        return helpers.error('custom.discountRange');
    }

    return value;
}).messages({
    'custom.priceRange': 'maxPrice must be greater than or equal to minPrice',
    'custom.discountRange': 'maxDiscount must be greater than or equal to minDiscount'
});

// Featured deals validation
const featuredDealsSchema = Joi.object({
    limit: Joi.number().integer().min(1).max(50).default(12)
});

// Sponsored listings validation
const sponsoredSchema = Joi.object({
    limit: Joi.number().integer().min(1).max(20).default(10)
});

// Trending products validation
const trendingSchema = Joi.object({
    limit: Joi.number().integer().min(1).max(50).default(20)
});

// Categories validation
const categoriesSchema = Joi.object({
    limit: Joi.number().integer().min(1).max(100),
    industryId: Joi.string().uuid(),
    includeCount: Joi.boolean().default(true)
});

// Industries validation
const industriesSchema = Joi.object({
    limit: Joi.number().integer().min(1).max(100),
    includeCount: Joi.boolean().default(true)
});

// Filters metadata validation (no parameters needed)
const filtersSchema = Joi.object({});

/**
 * Middleware to validate query parameters
 * @param {Joi.Schema} schema - Joi validation schema
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
                message: 'Validation failed',
                errorCode: 'VALIDATION_ERROR',
                errors
            });
        }

        // Attach validated query to request
        req.validatedQuery = value;
        next();
    };
};

module.exports = {
    marketplaceValidation: {
        products: productsFiltersSchema,
        featuredDeals: featuredDealsSchema,
        sponsored: sponsoredSchema,
        trending: trendingSchema,
        categories: categoriesSchema,
        industries: industriesSchema,
        filters: filtersSchema
    },
    validateQuery
};
