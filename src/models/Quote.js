const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Quote Model
 * Represents supplier quotes in response to buyer RFQs
 */
const Quote = sequelize.define('Quote', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    quoteNumber: {
        type: DataTypes.STRING(50),
        unique: true,
        allowNull: false,
        field: 'quote_number'
    },
    rfqId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'rfqs',
            key: 'id'
        },
        field: 'rfq_id'
    },
    supplierId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        },
        field: 'supplier_id'
    },
    buyerId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        },
        field: 'buyer_id'
    },
    productId: {
        type: DataTypes.UUID,
        references: {
            model: 'products',
            key: 'id'
        },
        field: 'product_id'
    },
    quotePrice: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        validate: {
            min: 0
        },
        field: 'quote_price'
    },
    originalPrice: {
        type: DataTypes.DECIMAL(15, 2),
        validate: {
            min: 0
        },
        field: 'original_price'
    },
    discountPercent: {
        type: DataTypes.DECIMAL(5, 2),
        validate: {
            min: 0,
            max: 100
        },
        field: 'discount_percent'
    },
    quantity: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false
    },
    unit: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    deliveryDays: {
        type: DataTypes.INTEGER,
        validate: {
            min: 1
        },
        field: 'delivery_days'
    },
    validUntil: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        field: 'valid_until'
    },
    paymentTerms: {
        type: DataTypes.TEXT,
        field: 'payment_terms'
    },
    shippingTerms: {
        type: DataTypes.TEXT,
        field: 'shipping_terms'
    },
    notes: {
        type: DataTypes.TEXT
    },
    status: {
        type: DataTypes.ENUM('pending', 'accepted', 'rejected', 'expired', 'converted'),
        defaultValue: 'pending'
    },
    acceptedAt: {
        type: DataTypes.DATE,
        field: 'accepted_at'
    },
    rejectedAt: {
        type: DataTypes.DATE,
        field: 'rejected_at'
    },
    rejectionReason: {
        type: DataTypes.TEXT,
        field: 'rejection_reason'
    },
    createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'created_at'
    },
    updatedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'updated_at'
    }
}, {
    tableName: 'quotes',
    timestamps: true,
    underscored: true,
    indexes: [
        {
            fields: ['rfq_id']
        },
        {
            fields: ['buyer_id']
        },
        {
            fields: ['supplier_id']
        },
        {
            fields: ['status']
        },
        {
            fields: ['created_at']
        }
    ],
    hooks: {
        beforeCreate: async (quote) => {
            // Generate Quote number
            const timestamp = Date.now();
            const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
            quote.quoteNumber = `QT-${timestamp}-${random}`;

            // Calculate discount if original price is provided
            if (quote.originalPrice && quote.quotePrice) {
                const discount = ((quote.originalPrice - quote.quotePrice) / quote.originalPrice) * 100;
                quote.discountPercent = Math.max(0, Math.min(100, discount));
            }
        },
        afterCreate: async (quote) => {
            // Increment RFQ quote count
            const RFQ = require('./RFQ');
            await RFQ.increment('quoteCount', { where: { id: quote.rfqId } });
        }
    }
});

// Associations
Quote.associate = (models) => {
    Quote.belongsTo(models.RFQ, {
        foreignKey: 'rfq_id',
        as: 'rfq'
    });

    Quote.belongsTo(models.User, {
        foreignKey: 'supplier_id',
        as: 'supplier'
    });

    Quote.belongsTo(models.User, {
        foreignKey: 'buyer_id',
        as: 'buyer'
    });

    Quote.belongsTo(models.Product, {
        foreignKey: 'product_id',
        as: 'product'
    });

    Quote.hasMany(models.QuoteMessage, {
        foreignKey: 'quote_id',
        as: 'messages'
    });
};

module.exports = Quote;
