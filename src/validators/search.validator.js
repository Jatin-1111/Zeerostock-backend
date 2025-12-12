const Joi = require('joi');

/**
 * Search Validators
 * Joi validation schemas for all search endpoints
 */

// Suggestions query validator
const suggestionsQuerySchema = Joi.object({
  q: Joi.string().min(2).max(200).required()
    .messages({
      'string.empty': 'Search query is required',
      'string.min': 'Query must be at least 2 characters',
      'string.max': 'Query cannot exceed 200 characters',
      'any.required': 'Search query is required'
    }),
  limit: Joi.number().integer().min(1).max(50).default(10)
    .messages({
      'number.base': 'Limit must be a number',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 50'
    })
});

// Products search query validator
const productsSearchSchema = Joi.object({
  q: Joi.string().min(2).max(200).required()
    .messages({
      'string.empty': 'Search query is required',
      'string.min': 'Query must be at least 2 characters',
      'string.max': 'Query cannot exceed 200 characters',
      'any.required': 'Search query is required'
    }),
  page: Joi.number().integer().min(1).default(1)
    .messages({
      'number.base': 'Page must be a number',
      'number.min': 'Page must be at least 1'
    }),
  limit: Joi.number().integer().min(1).max(100).default(20)
    .messages({
      'number.base': 'Limit must be a number',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100'
    }),
  categoryId: Joi.string().uuid()
    .messages({
      'string.guid': 'Invalid category ID format'
    }),
  industryId: Joi.string().uuid()
    .messages({
      'string.guid': 'Invalid industry ID format'
    }),
  minPrice: Joi.number().min(0)
    .messages({
      'number.base': 'Minimum price must be a number',
      'number.min': 'Minimum price cannot be negative'
    }),
  maxPrice: Joi.number().min(0)
    .messages({
      'number.base': 'Maximum price must be a number',
      'number.min': 'Maximum price cannot be negative'
    }),
  condition: Joi.alternatives().try(
    Joi.string().valid('new', 'like-new', 'good', 'fair'),
    Joi.array().items(Joi.string().valid('new', 'like-new', 'good', 'fair'))
  ).messages({
    'any.only': 'Condition must be one of: new, like-new, good, fair'
  }),
  listingType: Joi.alternatives().try(
    Joi.string().valid('auction', 'fixed', 'negotiable'),
    Joi.array().items(Joi.string().valid('auction', 'fixed', 'negotiable'))
  ).messages({
    'any.only': 'Listing type must be one of: auction, fixed, negotiable'
  }),
  verified: Joi.boolean()
    .messages({
      'boolean.base': 'Verified must be true or false'
    }),
  city: Joi.string().max(100)
    .messages({
      'string.max': 'City name cannot exceed 100 characters'
    }),
  minDiscount: Joi.number().min(0).max(100)
    .messages({
      'number.base': 'Minimum discount must be a number',
      'number.min': 'Minimum discount cannot be negative',
      'number.max': 'Minimum discount cannot exceed 100'
    }),
  sort: Joi.string().valid(
    'relevance', 'price-asc', 'price-desc', 'newest', 
    'views', 'rating', 'discount', 'ending-soon'
  ).default('relevance')
    .messages({
      'any.only': 'Invalid sort option'
    })
});

// Categories search validator
const categoriesSearchSchema = Joi.object({
  q: Joi.string().min(2).max(200).required()
    .messages({
      'string.empty': 'Search query is required',
      'string.min': 'Query must be at least 2 characters',
      'string.max': 'Query cannot exceed 200 characters',
      'any.required': 'Search query is required'
    }),
  limit: Joi.number().integer().min(1).max(50).default(10)
    .messages({
      'number.base': 'Limit must be a number',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 50'
    })
});

// Did you mean validator
const didYouMeanSchema = Joi.object({
  q: Joi.string().min(2).max(200).required()
    .messages({
      'string.empty': 'Search query is required',
      'string.min': 'Query must be at least 2 characters',
      'string.max': 'Query cannot exceed 200 characters',
      'any.required': 'Search query is required'
    }),
  limit: Joi.number().integer().min(1).max(10).default(5)
    .messages({
      'number.base': 'Limit must be a number',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 10'
    })
});

// Popular searches validator
const popularSearchesSchema = Joi.object({
  limit: Joi.number().integer().min(1).max(50).default(10)
    .messages({
      'number.base': 'Limit must be a number',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 50'
    }),
  period: Joi.string().valid('daily', 'weekly', 'monthly', 'all-time').default('all-time')
    .messages({
      'any.only': 'Period must be one of: daily, weekly, monthly, all-time'
    })
});

// Recent searches validator
const recentSearchesSchema = Joi.object({
  limit: Joi.number().integer().min(1).max(50).default(10)
    .messages({
      'number.base': 'Limit must be a number',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 50'
    })
});

// Track search analytics validator
const trackSearchSchema = Joi.object({
  query: Joi.string().min(1).max(200).required()
    .messages({
      'string.empty': 'Query is required',
      'string.max': 'Query cannot exceed 200 characters',
      'any.required': 'Query is required'
    }),
  productId: Joi.string().uuid()
    .messages({
      'string.guid': 'Invalid product ID format'
    }),
  resultPosition: Joi.number().integer().min(0)
    .messages({
      'number.base': 'Result position must be a number',
      'number.min': 'Result position cannot be negative'
    }),
  sessionId: Joi.string().uuid()
    .messages({
      'string.guid': 'Invalid session ID format'
    }),
  action: Joi.string().valid('search', 'click', 'view', 'conversion').required()
    .messages({
      'any.only': 'Action must be one of: search, click, view, conversion',
      'any.required': 'Action is required'
    })
});

// Middleware to validate suggestions query
const validateSuggestionsQuery = (req, res, next) => {
  const { error, value } = suggestionsQuerySchema.validate(req.query, {
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
      message: 'Validation failed',
      errors
    });
  }

  req.query = value;
  next();
};

// Middleware to validate products search query
const validateProductsSearch = (req, res, next) => {
  const { error, value } = productsSearchSchema.validate(req.query, {
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
      message: 'Validation failed',
      errors
    });
  }

  req.query = value;
  next();
};

// Middleware to validate categories search query
const validateCategoriesSearch = (req, res, next) => {
  const { error, value } = categoriesSearchSchema.validate(req.query, {
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
      message: 'Validation failed',
      errors
    });
  }

  req.query = value;
  next();
};

// Middleware to validate did you mean query
const validateDidYouMean = (req, res, next) => {
  const { error, value } = didYouMeanSchema.validate(req.query, {
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
      message: 'Validation failed',
      errors
    });
  }

  req.query = value;
  next();
};

// Middleware to validate popular searches query
const validatePopularSearches = (req, res, next) => {
  const { error, value } = popularSearchesSchema.validate(req.query, {
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
      message: 'Validation failed',
      errors
    });
  }

  req.query = value;
  next();
};

// Middleware to validate recent searches query
const validateRecentSearches = (req, res, next) => {
  const { error, value } = recentSearchesSchema.validate(req.query, {
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
      message: 'Validation failed',
      errors
    });
  }

  req.query = value;
  next();
};

// Middleware to validate track search body
const validateTrackSearch = (req, res, next) => {
  const { error, value } = trackSearchSchema.validate(req.body, {
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
      message: 'Validation failed',
      errors
    });
  }

  req.body = value;
  next();
};

module.exports = {
  validateSuggestionsQuery,
  validateProductsSearch,
  validateCategoriesSearch,
  validateDidYouMean,
  validatePopularSearches,
  validateRecentSearches,
  validateTrackSearch
};
