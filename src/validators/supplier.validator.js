const Joi = require('joi');

/**
 * Validation schema for creating a listing
 */
const createListingSchema = Joi.object({
    title: Joi.string().required().min(10).max(500)
        .messages({
            'string.empty': 'Product title is required',
            'string.min': 'Product title must be at least 10 characters long',
            'string.max': 'Product title cannot exceed 500 characters',
            'any.required': 'Product title is required'
        }),
    description: Joi.string().required().min(50)
        .messages({
            'string.empty': 'Product description is required',
            'string.min': 'Product description must be at least 50 characters long',
            'any.required': 'Product description is required'
        }),
    categoryId: Joi.string().required()
        .messages({
            'string.empty': 'Category is required',
            'any.required': 'Please select a category'
        }),
    priceAfter: Joi.number().positive().required()
        .messages({
            'number.base': 'Price must be a valid number',
            'number.positive': 'Price must be greater than 0',
            'any.required': 'Price is required'
        }),
    imageUrl: Joi.string().uri().required()
        .messages({
            'string.empty': 'At least one product image is required',
            'string.uri': 'Invalid image URL format',
            'any.required': 'Please upload at least one product image'
        }),
    galleryImages: Joi.array().items(Joi.string().uri()).optional().max(9)
        .messages({
            'array.max': 'You can upload a maximum of 10 images (1 main + 9 gallery images)'
        }),
    condition: Joi.string().valid('new', 'like-new', 'good', 'fair', 'refurbished').required()
        .messages({
            'any.only': 'Condition must be one of: new, like-new, good, fair, or refurbished',
            'any.required': 'Product condition is required'
        }),
    quantity: Joi.number().integer().positive().required()
        .messages({
            'number.base': 'Quantity must be a valid number',
            'number.integer': 'Quantity must be a whole number',
            'number.positive': 'Quantity must be greater than 0',
            'any.required': 'Quantity is required'
        }),
    unit: Joi.string().max(50).required()
        .messages({
            'string.empty': 'Unit is required',
            'string.max': 'Unit cannot exceed 50 characters',
            'any.required': 'Please specify the unit'
        }),
    city: Joi.string().max(255).required()
        .messages({
            'string.empty': 'Location is required',
            'string.max': 'Location cannot exceed 255 characters',
            'any.required': 'Please specify the location'
        }),
    listingType: Joi.string().valid('auction', 'fixed', 'negotiable').required()
        .messages({
            'any.only': 'Listing type must be one of: auction, fixed, or negotiable',
            'any.required': 'Listing type is required'
        }),
    expiresAt: Joi.date().iso().optional().allow(null, '')
        .messages({
            'date.base': 'Invalid expiration date format'
        })
});

/**
 * Validation schema for updating a listing
 */
const updateListingSchema = Joi.object({
    title: Joi.string().min(10).max(500).optional(),
    description: Joi.string().min(50).optional(),
    categoryId: Joi.string().optional(),
    priceBefore: Joi.number().positive().optional(),
    priceAfter: Joi.number().positive().optional(),
    discountPercent: Joi.number().min(0).max(100).optional(),
    imageUrl: Joi.string().uri().optional(),
    galleryImages: Joi.array().items(Joi.string().uri()).optional(),
    condition: Joi.string().valid('new', 'like-new', 'good', 'fair', 'refurbished').optional(),
    quantity: Joi.number().integer().positive().optional(),
    unit: Joi.string().max(50).optional(),
    city: Joi.string().max(255).optional(),
    state: Joi.string().max(255).optional(),
    listingType: Joi.string().valid('auction', 'fixed', 'negotiable').optional(),
    status: Joi.string().valid('active', 'draft', 'sold', 'expired').optional(),
    expiresAt: Joi.date().iso().optional(),
    availableQuantity: Joi.number().integer().positive().optional(),
    minOrderQuantity: Joi.number().integer().positive().optional()
}).min(1); // At least one field must be present

/**
 * Validation schema for updating order item status
 */
const updateOrderItemStatusSchema = Joi.object({
    status: Joi.string()
        .valid('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')
        .required()
});

module.exports = {
    createListingSchema,
    updateListingSchema,
    updateOrderItemStatusSchema
};
