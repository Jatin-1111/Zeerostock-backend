const Joi = require('joi');

/**
 * Validation schema for creating a listing
 */
const createListingSchema = Joi.object({
    title: Joi.string().required().min(10).max(500),
    description: Joi.string().required().min(50),
    categoryId: Joi.string().required(),
    priceAfter: Joi.number().positive().required(),
    imageUrl: Joi.string().uri().required(),
    galleryImages: Joi.array().items(Joi.string().uri()).optional(),
    condition: Joi.string().valid('new', 'like-new', 'good', 'fair', 'refurbished').required(),
    quantity: Joi.number().integer().positive().required(),
    unit: Joi.string().max(50).required(),
    city: Joi.string().max(255).required(),
    listingType: Joi.string().valid('auction', 'fixed', 'negotiable').required(),
    expiresAt: Joi.date().iso().optional().allow(null, '')
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
