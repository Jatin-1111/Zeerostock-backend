/**
 * Models Index
 * Central export point for all Sequelize models
 */

const RFQ = require('./RFQ');
const Quote = require('./Quote');
const QuoteMessage = require('./QuoteMessage');

// Export all models
module.exports = {
    RFQ,
    Quote,
    QuoteMessage
};
