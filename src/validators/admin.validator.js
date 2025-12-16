const Joi = require('joi');

/**
 * Approve verification validation
 */
const approveVerificationSchema = Joi.object({
    admin_notes: Joi.string()
        .max(1000)
        .optional()
        .messages({
            'string.max': 'Admin notes cannot exceed 1000 characters'
        })
});

/**
 * Reject verification validation
 */
const rejectVerificationSchema = Joi.object({
    rejection_reason: Joi.string()
        .min(10)
        .max(1000)
        .required()
        .messages({
            'string.empty': 'Rejection reason is required',
            'string.min': 'Rejection reason must be at least 10 characters',
            'string.max': 'Rejection reason cannot exceed 1000 characters',
            'any.required': 'Rejection reason is required'
        }),

    admin_notes: Joi.string()
        .max(1000)
        .optional()
        .messages({
            'string.max': 'Admin notes cannot exceed 1000 characters'
        })
});

/**
 * Mark under review validation
 */
const markUnderReviewSchema = Joi.object({
    admin_notes: Joi.string()
        .max(1000)
        .optional()
        .messages({
            'string.max': 'Admin notes cannot exceed 1000 characters'
        })
});

/**
 * Get all verifications query validation
 */
const getAllVerificationsQuerySchema = Joi.object({
    status: Joi.string()
        .valid('all', 'pending', 'under_review', 'verified', 'rejected')
        .optional()
        .default('all')
        .messages({
            'any.only': 'Invalid status. Must be one of: all, pending, under_review, verified, rejected'
        }),

    page: Joi.number()
        .integer()
        .min(1)
        .optional()
        .default(1)
        .messages({
            'number.base': 'Page must be a number',
            'number.min': 'Page must be at least 1'
        }),

    limit: Joi.number()
        .integer()
        .min(1)
        .max(100)
        .optional()
        .default(20)
        .messages({
            'number.base': 'Limit must be a number',
            'number.min': 'Limit must be at least 1',
            'number.max': 'Limit cannot exceed 100'
        })
});

/**
 * Get pending verifications query validation
 */
const getPendingVerificationsQuerySchema = Joi.object({
    page: Joi.number()
        .integer()
        .min(1)
        .optional()
        .default(1)
        .messages({
            'number.base': 'Page must be a number',
            'number.min': 'Page must be at least 1'
        }),

    limit: Joi.number()
        .integer()
        .min(1)
        .max(100)
        .optional()
        .default(20)
        .messages({
            'number.base': 'Limit must be a number',
            'number.min': 'Limit must be at least 1',
            'number.max': 'Limit cannot exceed 100'
        })
});

module.exports = {
    approveVerificationSchema,
    rejectVerificationSchema,
    markUnderReviewSchema,
    getAllVerificationsQuerySchema,
    getPendingVerificationsQuerySchema
};
