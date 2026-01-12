/**
 * Models Index
 * Central export point for all Sequelize models
 */

const RFQ = require('./RFQ');
const Quote = require('./Quote');
const QuoteMessage = require('./QuoteMessage');

// Initialize associations
const models = {
    RFQ,
    Quote,
    QuoteMessage
};

// Call associate methods if they exist
Object.values(models).forEach(model => {
    if (model.associate) {
        model.associate(models);
    }
});

// Export all models
module.exports = models;
