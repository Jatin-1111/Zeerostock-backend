const Joi = require('joi');

/**
 * Switch role validation
 */
const switchRoleSchema = Joi.object({
    role: Joi.string()
        .valid('buyer', 'supplier')
        .required()
        .messages({
            'string.base': 'Role must be a string',
            'any.only': 'Role must be either buyer or supplier',
            'any.required': 'Role is required'
        })
});

/**
 * Request supplier role validation
 */
const requestSupplierRoleSchema = Joi.object({
    business_name: Joi.string()
        .min(2)
        .max(100)
        .required()
        .messages({
            'string.empty': 'Business name is required',
            'string.min': 'Business name must be at least 2 characters',
            'string.max': 'Business name cannot exceed 100 characters'
        }),

    business_type: Joi.string()
        .valid('manufacturer', 'distributor', 'wholesaler', 'retailer', 'other')
        .required()
        .messages({
            'any.only': 'Invalid business type',
            'any.required': 'Business type is required'
        }),

    business_description: Joi.string()
        .min(50)
        .max(1000)
        .required()
        .messages({
            'string.empty': 'Business description is required',
            'string.min': 'Business description must be at least 50 characters',
            'string.max': 'Business description cannot exceed 1000 characters'
        }),

    business_address: Joi.string()
        .min(10)
        .max(500)
        .required()
        .messages({
            'string.empty': 'Business address is required',
            'string.min': 'Business address must be at least 10 characters',
            'string.max': 'Business address cannot exceed 500 characters'
        }),

    gst_number: Joi.string()
        .pattern(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)
        .optional()
        .messages({
            'string.pattern.base': 'Invalid GST number format'
        }),

    registration_number: Joi.string()
        .optional()
        .messages({
            'string.base': 'Registration number must be a string'
        }),

    years_in_business: Joi.number()
        .integer()
        .min(0)
        .max(200)
        .optional()
        .messages({
            'number.base': 'Years in business must be a number',
            'number.min': 'Years in business cannot be negative',
            'number.max': 'Years in business cannot exceed 200'
        }),

    annual_revenue: Joi.string()
        .optional()
        .messages({
            'string.base': 'Annual revenue must be a string'
        }),

    employee_count: Joi.number()
        .integer()
        .min(1)
        .optional()
        .messages({
            'number.base': 'Employee count must be a number',
            'number.min': 'Employee count must be at least 1'
        }),

    products_offered: Joi.array()
        .items(Joi.string())
        .min(1)
        .optional()
        .messages({
            'array.base': 'Products offered must be an array',
            'array.min': 'At least one product must be specified'
        }),

    website: Joi.string()
        .uri()
        .optional()
        .allow('', null)
        .messages({
            'string.uri': 'Invalid website URL format'
        }),

    contact_person: Joi.string()
        .optional()
        .messages({
            'string.base': 'Contact person must be a string'
        }),

    contact_phone: Joi.string()
        .pattern(/^[+]?[0-9\s()-]{10,20}$/)
        .optional()
        .messages({
            'string.pattern.base': 'Invalid phone number format'
        })
});

/**
 * Update buyer profile validation
 */
const updateBuyerProfileSchema = Joi.object({
    company_name: Joi.string()
        .min(2)
        .max(100)
        .optional()
        .messages({
            'string.min': 'Company name must be at least 2 characters',
            'string.max': 'Company name cannot exceed 100 characters'
        }),

    industry: Joi.string()
        .optional()
        .messages({
            'string.base': 'Industry must be a string'
        }),

    purchase_frequency: Joi.string()
        .valid('daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'as_needed')
        .optional()
        .messages({
            'any.only': 'Invalid purchase frequency'
        }),

    preferred_payment_terms: Joi.string()
        .optional()
        .messages({
            'string.base': 'Preferred payment terms must be a string'
        }),

    budget_range: Joi.string()
        .optional()
        .messages({
            'string.base': 'Budget range must be a string'
        }),

    preferred_categories: Joi.array()
        .items(Joi.string())
        .optional()
        .messages({
            'array.base': 'Preferred categories must be an array'
        })
});

/**
 * Update supplier profile validation
 */
const updateSupplierProfileSchema = Joi.object({
    business_name: Joi.string()
        .min(2)
        .max(100)
        .optional()
        .messages({
            'string.min': 'Business name must be at least 2 characters',
            'string.max': 'Business name cannot exceed 100 characters'
        }),

    business_type: Joi.string()
        .valid('manufacturer', 'distributor', 'wholesaler', 'retailer', 'other')
        .optional()
        .messages({
            'any.only': 'Invalid business type'
        }),

    business_description: Joi.string()
        .min(50)
        .max(1000)
        .optional()
        .messages({
            'string.min': 'Business description must be at least 50 characters',
            'string.max': 'Business description cannot exceed 1000 characters'
        }),

    business_address: Joi.string()
        .min(10)
        .max(500)
        .optional()
        .messages({
            'string.min': 'Business address must be at least 10 characters',
            'string.max': 'Business address cannot exceed 500 characters'
        }),

    products_offered: Joi.array()
        .items(Joi.string())
        .optional()
        .messages({
            'array.base': 'Products offered must be an array'
        }),

    minimum_order_quantity: Joi.string()
        .optional()
        .messages({
            'string.base': 'Minimum order quantity must be a string'
        }),

    delivery_time: Joi.string()
        .optional()
        .messages({
            'string.base': 'Delivery time must be a string'
        }),

    payment_terms: Joi.string()
        .optional()
        .messages({
            'string.base': 'Payment terms must be a string'
        }),

    certifications: Joi.array()
        .items(Joi.string())
        .optional()
        .messages({
            'array.base': 'Certifications must be an array'
        }),

    website: Joi.string()
        .uri()
        .optional()
        .allow('', null)
        .messages({
            'string.uri': 'Invalid website URL format'
        })
});

module.exports = {
    switchRoleSchema,
    requestSupplierRoleSchema,
    updateBuyerProfileSchema,
    updateSupplierProfileSchema
};
