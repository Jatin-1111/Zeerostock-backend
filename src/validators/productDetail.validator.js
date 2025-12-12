const Joi = require('joi');

/**
 * Product Detail Validators
 * Joi validation schemas for product detail endpoints
 */

// Product ID parameter validator
const productIdSchema = Joi.object({
  id: Joi.string().uuid().required()
    .messages({
      'string.guid': 'Invalid product ID format',
      'any.required': 'Product ID is required'
    })
});

// Reviews query validator
const reviewsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(10),
  rating: Joi.number().integer().min(1).max(5)
});

// Quote request validator
const quoteRequestSchema = Joi.object({
  quantity: Joi.number().integer().min(1).required()
    .messages({
      'any.required': 'Quantity is required',
      'number.min': 'Quantity must be at least 1'
    }),
  targetPrice: Joi.number().min(0),
  message: Joi.string().min(10).max(1000).required()
    .messages({
      'any.required': 'Message is required',
      'string.min': 'Message must be at least 10 characters',
      'string.max': 'Message cannot exceed 1000 characters'
    }),
  companyName: Joi.string().max(200),
  gstNumber: Joi.string().pattern(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/),
  deliveryPincode: Joi.string().pattern(/^[1-9][0-9]{5}$/)
});

// Share validator
const shareSchema = Joi.object({
  method: Joi.string().valid('link', 'whatsapp', 'email', 'facebook', 'linkedin', 'twitter').required()
    .messages({
      'any.only': 'Invalid share method',
      'any.required': 'Share method is required'
    })
});

// Related products query validator
const relatedQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(20).default(8)
});

// Middleware validators
const validateProductId = (req, res, next) => {
  const { error } = productIdSchema.validate(req.params);
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: error.details.map(d => ({ field: d.path.join('.'), message: d.message }))
    });
  }
  next();
};

const validateReviewsQuery = (req, res, next) => {
  const { error, value } = reviewsQuerySchema.validate(req.query, { stripUnknown: true });
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: error.details.map(d => ({ field: d.path.join('.'), message: d.message }))
    });
  }
  req.query = value;
  next();
};

const validateQuoteRequest = (req, res, next) => {
  const { error, value } = quoteRequestSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: error.details.map(d => ({ field: d.path.join('.'), message: d.message }))
    });
  }
  req.body = value;
  next();
};

const validateShare = (req, res, next) => {
  const { error, value } = shareSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: error.details.map(d => ({ field: d.path.join('.'), message: d.message }))
    });
  }
  req.body = value;
  next();
};

const validateRelatedQuery = (req, res, next) => {
  const { error, value } = relatedQuerySchema.validate(req.query, { stripUnknown: true });
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: error.details.map(d => ({ field: d.path.join('.'), message: d.message }))
    });
  }
  req.query = value;
  next();
};

module.exports = {
  validateProductId,
  validateReviewsQuery,
  validateQuoteRequest,
  validateShare,
  validateRelatedQuery
};
