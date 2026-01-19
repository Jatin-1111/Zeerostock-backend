const app = require('./app');
const { testConnection } = require('./config/database');
require('dotenv').config();

// Start server function (only for local development)
const startServer = async () => {
    try {
        // Start Express server FIRST (don't block on DB)
        const PORT = process.env.PORT || 5000;
        const server = app.listen(PORT, () => {
            console.log('\n✨ Zeerostock Backend Server Started ✨');
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`🌐 API URL: http://localhost:${PORT}`);
            console.log(`🔐 Security: SOC2, GDPR, SSL Enabled`);
            console.log('\n📚 Available endpoints:');
            console.log('   🔐 Authentication:');
            console.log('      - POST /api/auth/signup');
            console.log('      - POST /api/auth/verify-otp');
            console.log('      - POST /api/auth/resend-otp');
            console.log('      - POST /api/auth/login');
            console.log('      - POST /api/auth/otp-login');
            console.log('      - POST /api/auth/verify-login-otp');
            console.log('      - POST /api/auth/social/google');
            console.log('      - POST /api/auth/refresh-token');
            console.log('      - POST /api/auth/logout');
            console.log('      - POST /api/auth/forgot-password');
            console.log('      - POST /api/auth/reset-password');
            console.log('      - GET  /api/auth/me');
            console.log('      - PUT  /api/auth/me');
            console.log('      - PUT  /api/auth/add-gst');
            console.log('      - PUT  /api/auth/set-role');
            console.log('\n   👥 Roles & Profiles:');
            console.log('      - GET  /api/roles (Get user roles)');
            console.log('      - POST /api/roles/switch-role');
            console.log('      - POST /api/roles/request-supplier-role');
            console.log('      - GET  /api/roles/supplier-verification-status');
            console.log('      - PUT  /api/roles/buyer-profile');
            console.log('      - PUT  /api/roles/supplier-profile');
            console.log('\n   🛡️ Admin (Supplier Verification):');
            console.log('      - GET  /api/admin/supplier-verifications');
            console.log('      - GET  /api/admin/supplier-verifications/stats');
            console.log('      - GET  /api/admin/supplier-verifications/all');
            console.log('      - GET  /api/admin/supplier-verifications/:id');
            console.log('      - POST /api/admin/supplier-verifications/:id/approve');
            console.log('      - POST /api/admin/supplier-verifications/:id/reject');
            console.log('      - POST /api/admin/supplier-verifications/:id/review');
            console.log('\n   🏠 Homepage:');
            console.log('      - GET  /api/homepage (Combined - All sections)');
            console.log('      - GET  /api/homepage/hero-banners');
            console.log('      - GET  /api/homepage/trending-categories');
            console.log('      - GET  /api/homepage/featured-deals');
            console.log('      - GET  /api/homepage/live-auctions');
            console.log('      - GET  /api/homepage/trending-products');
            console.log('      - GET  /api/homepage/market-insights');
            console.log('      - GET  /api/homepage/case-studies');
            console.log('      - GET  /api/homepage/testimonials');
            console.log('      - GET  /api/homepage/quick-stats');
            console.log('\n   🛒 Marketplace:');
            console.log('      - GET  /api/marketplace/products (All products with filters)');
            console.log('      - GET  /api/marketplace/categories');
            console.log('      - GET  /api/marketplace/industries');
            console.log('      - GET  /api/marketplace/featured-deals');
            console.log('      - GET  /api/marketplace/sponsored');
            console.log('      - GET  /api/marketplace/trending');
            console.log('      - GET  /api/marketplace/filters');
            console.log('\n   🔍 Search:');
            console.log('      - GET  /api/search/suggestions (Auto-suggestions)');
            console.log('      - GET  /api/search/products (Full-text search with filters)');
            console.log('      - GET  /api/search/categories (Category search)');
            console.log('      - GET  /api/search/did-you-mean (Spell correction)');
            console.log('      - GET  /api/search/popular (Popular searches)');
            console.log('      - GET  /api/search/recent (Recent searches - Auth required)');
            console.log('      - POST /api/search/track (Track analytics)');
            console.log('\n   📦 Product Detail:');
            console.log('      - GET    /api/products/:id (Main product detail)');
            console.log('      - GET    /api/products/:id/specifications');
            console.log('      - GET    /api/products/:id/seller');
            console.log('      - GET    /api/products/:id/reviews');
            console.log('      - GET    /api/products/:id/shipping');
            console.log('      - GET    /api/products/:id/related');
            console.log('      - POST   /api/products/:id/watch (Auth required)');
            console.log('      - DELETE /api/products/:id/watch (Auth required)');
            console.log('      - POST   /api/products/:id/request-quote (Auth required)');
            console.log('      - POST   /api/products/:id/share');
            console.log('      - GET    /api/products/:id/auction');
            console.log('\n   � Cart:');
            console.log('      - POST   /api/cart/add');
            console.log('      - GET    /api/cart');
            console.log('      - GET    /api/cart/count');
            console.log('      - PUT    /api/cart/update/:itemId');
            console.log('      - DELETE /api/cart/remove/:itemId');
            console.log('      - DELETE /api/cart/clear');
            console.log('      - POST   /api/cart/apply-coupon');
            console.log('      - POST   /api/cart/remove-coupon');
            console.log('      - GET    /api/cart/validate');
            console.log('      - GET    /api/cart/shipping-estimate');
            console.log('      - POST   /api/cart/checkout (Auth required)');
            console.log('      - POST   /api/cart/merge (Auth required)');
            console.log('\n   �💚 Health:');
            console.log('      - GET  /health');
            console.log('\n✅ Server ready to accept requests!\n');
        });
        // Test database connection in background (non-blocking)
        testConnection()
            .then(() => {
                console.log('✅ Database connection successful');
            })
            .catch((err) => {
                console.error('⚠️ Database connection failed (app still running):', err.message);
            });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error('❌ Unhandled Promise Rejection:', err);
    // Close server & exit process
    process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('👋 SIGTERM received. Shutting down gracefully...');
    // redisClient.quit();
    process.exit(0);
});

// Start the server only if running locally (not in serverless)
if (require.main === module) {
    startServer();
}

module.exports = app;
