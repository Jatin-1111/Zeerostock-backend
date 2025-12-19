const Joi = require('joi');

// Validate general settings update
const updateSettingsSchema = Joi.object({
    section: Joi.string()
        .valid('account', 'notifications', 'privacy', 'language')
        .required()
        .messages({
            'any.required': 'Settings section is required',
            'any.only': 'Section must be one of: account, notifications, privacy, language'
        }),
    data: Joi.object().required()
});

// Validate notification preferences
const notificationPreferencesSchema = Joi.object({
    email: Joi.boolean(),
    sms: Joi.boolean(),
    push: Joi.boolean(),
    marketing: Joi.boolean(),
    digest: Joi.boolean(),
    alerts: Joi.boolean()
}).min(1);

// Validate privacy settings
const privacySettingsSchema = Joi.object({
    dataSharing: Joi.boolean(),
    analytics: Joi.boolean()
}).min(1);

// Validate account information
const accountInfoSchema = Joi.object({
    firstName: Joi.string().min(2).max(100).trim(),
    lastName: Joi.string().min(2).max(100).trim(),
    phone: Joi.string().pattern(/^[+]?[0-9\s-()]+$/).min(10).max(20),
    companyName: Joi.string().min(2).max(255).trim(),
    gstNumber: Joi.string().length(15).uppercase().trim().allow('', null),
    bio: Joi.string().max(500).trim().allow('', null),
    street: Joi.string().max(255).trim().allow('', null),
    city: Joi.string().max(100).trim().allow('', null),
    state: Joi.string().max(100).trim().allow('', null),
    zip: Joi.string().max(20).trim().allow('', null)
}).min(1);

// Validate language preferences
const languagePreferencesSchema = Joi.object({
    language: Joi.string().min(2).max(50),
    region: Joi.string().min(2).max(100),
    dateFormat: Joi.string().valid('MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD', 'DD-MM-YYYY'),
    timeFormat: Joi.string().valid('12-hour', '24-hour'),
    currency: Joi.string().length(3).uppercase()
}).min(1);

// Middleware to validate settings update
const validateSettingsUpdate = (req, res, next) => {
    const { error } = updateSettingsSchema.validate(req.body, { abortEarly: false });

    if (error) {
        return res.status(400).json({
            success: false,
            message: 'Validation error',
            errors: error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }))
        });
    }

    // Validate section-specific data
    const { section, data } = req.body;
    let dataError;

    switch (section) {
        case 'notifications':
            dataError = notificationPreferencesSchema.validate(data).error;
            break;
        case 'privacy':
            dataError = privacySettingsSchema.validate(data).error;
            break;
        case 'account':
            dataError = accountInfoSchema.validate(data).error;
            break;
        case 'language':
            dataError = languagePreferencesSchema.validate(data).error;
            break;
    }

    if (dataError) {
        return res.status(400).json({
            success: false,
            message: `Invalid ${section} data`,
            errors: dataError.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }))
        });
    }

    next();
};

// Middleware to validate notification preferences
const validateNotifications = (req, res, next) => {
    const { error } = notificationPreferencesSchema.validate(req.body, { abortEarly: false });

    if (error) {
        return res.status(400).json({
            success: false,
            message: 'Invalid notification preferences',
            errors: error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }))
        });
    }

    next();
};

// Middleware to validate privacy settings
const validatePrivacy = (req, res, next) => {
    const { error } = privacySettingsSchema.validate(req.body, { abortEarly: false });

    if (error) {
        return res.status(400).json({
            success: false,
            message: 'Invalid privacy settings',
            errors: error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }))
        });
    }

    next();
};

// Middleware to validate account information
const validateAccount = (req, res, next) => {
    const { error } = accountInfoSchema.validate(req.body, { abortEarly: false });

    if (error) {
        return res.status(400).json({
            success: false,
            message: 'Invalid account information',
            errors: error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }))
        });
    }

    next();
};

// Middleware to validate language preferences
const validateLanguage = (req, res, next) => {
    const { error } = languagePreferencesSchema.validate(req.body, { abortEarly: false });

    if (error) {
        return res.status(400).json({
            success: false,
            message: 'Invalid language preferences',
            errors: error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }))
        });
    }

    next();
};

module.exports = {
    validateSettingsUpdate,
    validateNotifications,
    validatePrivacy,
    validateAccount,
    validateLanguage
};
