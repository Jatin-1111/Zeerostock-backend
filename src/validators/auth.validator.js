const Joi = require('joi');

// Password validation regex
const passwordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{8,}$/;

// GST validation regex
const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

// Mobile validation regex (Indian format)
const mobileRegex = /^[6-9]\d{9}$/;

// Validation Schemas
const authValidation = {
    // Signup validation
    signup: Joi.object({
        firstName: Joi.string()
            .min(2)
            .max(100)
            .trim()
            .required()
            .messages({
                'string.empty': 'First name is required',
                'string.min': 'First name must be at least 2 characters',
                'string.max': 'First name cannot exceed 100 characters'
            }),

        lastName: Joi.string()
            .min(2)
            .max(100)
            .trim()
            .required()
            .messages({
                'string.empty': 'Last name is required',
                'string.min': 'Last name must be at least 2 characters',
                'string.max': 'Last name cannot exceed 100 characters'
            }),

        companyName: Joi.string()
            .min(2)
            .max(255)
            .trim()
            .required()
            .messages({
                'string.empty': 'Company name is required',
                'string.min': 'Company name must be at least 2 characters',
                'string.max': 'Company name cannot exceed 255 characters'
            }),

        businessEmail: Joi.string()
            .email()
            .lowercase()
            .trim()
            .required()
            .messages({
                'string.empty': 'Business email is required',
                'string.email': 'Please provide a valid email address'
            }),

        mobile: Joi.string()
            .pattern(mobileRegex)
            .required()
            .messages({
                'string.empty': 'Mobile number is required',
                'string.pattern.base': 'Please provide a valid 10-digit mobile number'
            }),

        password: Joi.string()
            .pattern(passwordRegex)
            .required()
            .messages({
                'string.empty': 'Password is required',
                'string.pattern.base': 'Password must be at least 8 characters and contain at least one number and one special character'
            }),

        businessType: Joi.string()
            .valid('manufacturer', 'wholesaler', 'retailer', 'distributor', 'service_provider', 'other')
            .required()
            .messages({
                'string.empty': 'Business type is required',
                'any.only': 'Invalid business type'
            }),

        gstNumber: Joi.string()
            .pattern(gstRegex)
            .optional()
            .allow('', null)
            .messages({
                'string.pattern.base': 'Please provide a valid GST number'
            }),

        acceptedTerms: Joi.boolean()
            .valid(true)
            .required()
            .messages({
                'any.only': 'You must accept the terms and conditions'
            })
    }),

    // Verify OTP validation
    verifyOTP: Joi.object({
        identifier: Joi.string()
            .required()
            .messages({
                'string.empty': 'Email or mobile is required'
            }),

        otp: Joi.string()
            .length(6)
            .pattern(/^[0-9]+$/)
            .required()
            .messages({
                'string.empty': 'OTP is required',
                'string.length': 'OTP must be 6 digits',
                'string.pattern.base': 'OTP must contain only numbers'
            })
    }),

    // Resend OTP validation
    resendOTP: Joi.object({
        identifier: Joi.string()
            .required()
            .messages({
                'string.empty': 'Email or mobile is required'
            })
    }),

    // Login validation
    login: Joi.object({
        identifier: Joi.string()
            .required()
            .messages({
                'string.empty': 'Email or mobile number is required'
            }),

        password: Joi.string()
            .required()
            .messages({
                'string.empty': 'Password is required'
            }),

        requestedRole: Joi.string()
            .valid('buyer', 'supplier', 'admin')
            .optional()
            .messages({
                'any.only': 'Invalid role. Must be buyer, supplier, or admin'
            })
    }),

    // OTP Login validation
    otpLogin: Joi.object({
        mobile: Joi.string()
            .pattern(mobileRegex)
            .required()
            .messages({
                'string.empty': 'Mobile number is required',
                'string.pattern.base': 'Please provide a valid 10-digit mobile number'
            })
    }),

    // Refresh token validation
    refreshToken: Joi.object({
        refreshToken: Joi.string()
            .required()
            .messages({
                'string.empty': 'Refresh token is required'
            })
    }),

    // Forgot password validation
    forgotPassword: Joi.object({
        email: Joi.string()
            .email()
            .lowercase()
            .trim()
            .required()
            .messages({
                'string.empty': 'Email is required',
                'string.email': 'Please provide a valid email address'
            })
    }),

    // Reset password validation
    resetPassword: Joi.object({
        token: Joi.string()
            .required()
            .messages({
                'string.empty': 'Reset token is required'
            }),

        newPassword: Joi.string()
            .pattern(passwordRegex)
            .required()
            .messages({
                'string.empty': 'New password is required',
                'string.pattern.base': 'Password must be at least 8 characters and contain at least one number and one special character'
            }),

        confirmPassword: Joi.string()
            .valid(Joi.ref('newPassword'))
            .required()
            .messages({
                'string.empty': 'Confirm password is required',
                'any.only': 'Passwords do not match'
            })
    }),

    // Update profile validation
    updateProfile: Joi.object({
        firstName: Joi.string()
            .min(2)
            .max(100)
            .trim()
            .optional(),

        lastName: Joi.string()
            .min(2)
            .max(100)
            .trim()
            .optional(),

        companyName: Joi.string()
            .min(2)
            .max(255)
            .trim()
            .optional(),

        mobile: Joi.string()
            .pattern(mobileRegex)
            .optional(),

        businessType: Joi.string()
            .valid('manufacturer', 'wholesaler', 'retailer', 'distributor', 'service_provider', 'other')
            .optional()
    }),

    // Add GST validation
    addGST: Joi.object({
        gstNumber: Joi.string()
            .pattern(gstRegex)
            .required()
            .messages({
                'string.empty': 'GST number is required',
                'string.pattern.base': 'Please provide a valid GST number'
            })
    }),

    // Set role validation
    setRole: Joi.object({
        role: Joi.string()
            .valid('buyer', 'supplier')
            .required()
            .messages({
                'string.empty': 'Role is required',
                'any.only': 'Role must be either buyer or supplier'
            })
    }),

    // Verify Login OTP validation
    verifyLoginOTP: Joi.object({
        identifier: Joi.string()
            .required()
            .messages({
                'string.empty': 'Email or mobile is required'
            }),

        otp: Joi.string()
            .length(6)
            .pattern(/^[0-9]+$/)
            .required()
            .messages({
                'string.empty': 'OTP is required',
                'string.length': 'OTP must be 6 digits',
                'string.pattern.base': 'OTP must contain only numbers'
            })
    }),

    // Change Password validation
    changePassword: Joi.object({
        currentPassword: Joi.string()
            .required()
            .messages({
                'string.empty': 'Current password is required'
            }),

        newPassword: Joi.string()
            .pattern(passwordRegex)
            .required()
            .messages({
                'string.empty': 'New password is required',
                'string.pattern.base': 'Password must be at least 8 characters and contain at least one number and one special character'
            })
    })
};

// Validation middleware factory
const validate = (schema) => {
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
                message: 'Validation failed',
                errors
            });
        }

        req.validatedBody = value;
        next();
    };
};

module.exports = { authValidation, validate };
