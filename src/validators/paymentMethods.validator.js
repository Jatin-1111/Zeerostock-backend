const Joi = require('joi');

/**
 * Validation schema for adding a payment method
 */
const addPaymentMethodSchema = Joi.object({
    type: Joi.string()
        .valid('card', 'bank', 'escrow', 'upi')
        .required()
        .messages({
            'any.required': 'Payment method type is required',
            'any.only': 'Payment method type must be card, bank, escrow, or upi'
        }),

    // Card fields
    cardNumber: Joi.when('type', {
        is: 'card',
        then: Joi.string()
            .pattern(/^[0-9]{13,19}$/)
            .required()
            .messages({
                'string.pattern.base': 'Card number must be 13-19 digits',
                'any.required': 'Card number is required for card payment method'
            }),
        otherwise: Joi.forbidden()
    }),

    expiryDate: Joi.when('type', {
        is: 'card',
        then: Joi.string()
            .pattern(/^(0[1-9]|1[0-2])\/([0-9]{2})$/)
            .required()
            .messages({
                'string.pattern.base': 'Expiry date must be in MM/YY format',
                'any.required': 'Expiry date is required for card payment method'
            }),
        otherwise: Joi.forbidden()
    }),

    cvv: Joi.when('type', {
        is: 'card',
        then: Joi.string()
            .pattern(/^[0-9]{3,4}$/)
            .required()
            .messages({
                'string.pattern.base': 'CVV must be 3 or 4 digits',
                'any.required': 'CVV is required for card payment method'
            }),
        otherwise: Joi.forbidden()
    }),

    cardName: Joi.when('type', {
        is: 'card',
        then: Joi.string()
            .min(2)
            .max(255)
            .required()
            .messages({
                'string.min': 'Card holder name must be at least 2 characters',
                'string.max': 'Card holder name must not exceed 255 characters',
                'any.required': 'Card holder name is required for card payment method'
            }),
        otherwise: Joi.forbidden()
    }),

    // Bank/Escrow fields
    emailId: Joi.when('type', {
        is: Joi.string().valid('bank', 'escrow'),
        then: Joi.string()
            .email()
            .required()
            .messages({
                'string.email': 'Please provide a valid email address',
                'any.required': 'Email is required for bank/escrow payment method'
            }),
        otherwise: Joi.forbidden()
    }),

    password: Joi.when('type', {
        is: Joi.string().valid('bank', 'escrow'),
        then: Joi.string()
            .min(6)
            .required()
            .messages({
                'string.min': 'Password must be at least 6 characters',
                'any.required': 'Password is required for bank/escrow payment method'
            }),
        otherwise: Joi.forbidden()
    }),

    // UPI fields
    upiId: Joi.when('type', {
        is: 'upi',
        then: Joi.string()
            .pattern(/^[\w.-]+@[\w.-]+$/)
            .required()
            .messages({
                'string.pattern.base': 'Please provide a valid UPI ID (e.g., username@upi)',
                'any.required': 'UPI ID is required for UPI payment method'
            }),
        otherwise: Joi.forbidden()
    }),

    // Optional fields
    nickname: Joi.string()
        .max(100)
        .optional()
        .messages({
            'string.max': 'Nickname must not exceed 100 characters'
        })
});

module.exports = {
    addPaymentMethodSchema
};
