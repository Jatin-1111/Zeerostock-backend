const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * RFQ (Request for Quote) Model
 * Represents buyer requests for product quotes from suppliers
 */
const RFQ = sequelize.define('RFQ', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    rfqNumber: {
        type: DataTypes.STRING(50),
        unique: true,
        allowNull: false,
        field: 'rfq_number'
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
    title: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    categoryId: {
        type: DataTypes.UUID,
        references: {
            model: 'categories',
            key: 'id'
        },
        field: 'category_id'
    },
    industryId: {
        type: DataTypes.UUID,
        references: {
            model: 'industries',
            key: 'id'
        },
        field: 'industry_id'
    },
    quantity: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        validate: {
            min: 0
        }
    },
    unit: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    budgetMin: {
        type: DataTypes.DECIMAL(15, 2),
        validate: {
            min: 0
        },
        field: 'budget_min'
    },
    budgetMax: {
        type: DataTypes.DECIMAL(15, 2),
        validate: {
            min: 0
        },
        field: 'budget_max'
    },
    requiredByDate: {
        type: DataTypes.DATEONLY,
        field: 'required_by_date'
    },
    detailedRequirements: {
        type: DataTypes.TEXT,
        field: 'detailed_requirements'
    },
    preferredLocation: {
        type: DataTypes.STRING(255),
        field: 'preferred_location'
    },
    durationDays: {
        type: DataTypes.INTEGER,
        defaultValue: 7,
        field: 'duration_days'
    },
    status: {
        type: DataTypes.ENUM('active', 'closed', 'expired', 'fulfilled'),
        defaultValue: 'active'
    },
    attachments: {
        type: DataTypes.JSONB,
        defaultValue: []
    },
    viewCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: 'view_count'
    },
    quoteCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: 'quote_count'
    },
    expiresAt: {
        type: DataTypes.DATE,
        field: 'expires_at'
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
    tableName: 'rfqs',
    timestamps: true,
    underscored: true,
    indexes: [
        {
            fields: ['buyer_id']
        },
        {
            fields: ['status']
        },
        {
            fields: ['category_id']
        },
        {
            fields: ['expires_at']
        },
        {
            fields: ['created_at']
        }
    ],
    hooks: {
        beforeCreate: async (rfq) => {
            // Generate RFQ number with date format (RFQ-YYYYMMDD-XXX)
            const now = new Date();
            const dateStr = now.getFullYear().toString() +
                (now.getMonth() + 1).toString().padStart(2, '0') +
                now.getDate().toString().padStart(2, '0');
            const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
            rfq.rfqNumber = `RFQ-${dateStr}-${random}`;

            // Set expiry date based on duration
            if (rfq.durationDays && !rfq.expiresAt) {
                const expiryDate = new Date();
                expiryDate.setDate(expiryDate.getDate() + rfq.durationDays);
                rfq.expiresAt = expiryDate;
            }
        }
    }
});

// Associations
RFQ.associate = (models) => {
    RFQ.hasMany(models.Quote, {
        foreignKey: 'rfqId',
        as: 'quotes'
    });
};

module.exports = RFQ;
