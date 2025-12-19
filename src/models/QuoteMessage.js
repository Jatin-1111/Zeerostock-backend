const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Quote Message Model
 * Represents messages between buyers and suppliers regarding quotes
 */
const QuoteMessage = sequelize.define('QuoteMessage', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    quoteId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'quotes',
            key: 'id'
        },
        field: 'quote_id'
    },
    senderId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        },
        field: 'sender_id'
    },
    receiverId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        },
        field: 'receiver_id'
    },
    message: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    isRead: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'is_read'
    },
    attachments: {
        type: DataTypes.JSONB,
        defaultValue: []
    },
    createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'created_at'
    }
}, {
    tableName: 'quote_messages',
    timestamps: false,
    underscored: true,
    indexes: [
        {
            fields: ['quote_id']
        },
        {
            fields: ['sender_id']
        },
        {
            fields: ['receiver_id']
        },
        {
            fields: ['created_at']
        }
    ]
});

// Associations
QuoteMessage.associate = (models) => {
    QuoteMessage.belongsTo(models.Quote, {
        foreignKey: 'quote_id',
        as: 'quote'
    });

    QuoteMessage.belongsTo(models.User, {
        foreignKey: 'sender_id',
        as: 'sender'
    });

    QuoteMessage.belongsTo(models.User, {
        foreignKey: 'receiver_id',
        as: 'receiver'
    });
};

module.exports = QuoteMessage;
