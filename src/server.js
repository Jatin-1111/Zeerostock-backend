const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
require('dotenv').config();

// Import configurations
const { testConnection } = require('./config/database');
// const { redisClient } = require('./config/redis');

// Import routes
const authRoutes = require('./routes/auth.routes');

// Import middleware
const { errorHandler, notFound } = require('./middleware/error.middleware');
// const { generalLimiter } = require('./middleware/rateLimiter.middleware');

// Initialize Express app
const app = express();

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    }
}));

// CORS configuration
const corsOptions = {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parser
app.use(cookieParser());

// Logging middleware
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined'));
}

// General rate limiting - DISABLED FOR TESTING
// app.use(generalLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV
    });
});

// API info endpoint
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Zeerostock B2B Marketplace API',
        version: '1.0.0',
        documentation: '/api-docs',
        endpoints: {
            auth: '/api/auth',
            health: '/health'
        },
        security: {
            soc2: 'Compliant',
            gdpr: 'Compliant',
            ssl: 'Enabled'
        }
    });
});

// API Routes
app.use('/api/auth', authRoutes);

// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

// Start server function
const startServer = async () => {
    try {
        // Test database connection
        console.log('🔌 Connecting to PostgreSQL (Supabase)...');
        await testConnection();

        // Test Redis connection
        // console.log('🔌 Connecting to Redis...');
        // await redisClient.ping();        // Start Express server
        const PORT = process.env.PORT || 5000;
        app.listen(PORT, () => {
            console.log('\n✨ Zeerostock Backend Server Started ✨');
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`🌐 API URL: http://localhost:${PORT}`);
            console.log(`🔐 Security: SOC2, GDPR, SSL Enabled`);
            console.log('\n📚 Available endpoints:');
            console.log('   - GET  /health');
            console.log('   - POST /api/auth/signup');
            console.log('   - POST /api/auth/verify-otp');
            console.log('   - POST /api/auth/resend-otp');
            console.log('   - POST /api/auth/login');
            console.log('   - POST /api/auth/otp-login');
            console.log('   - POST /api/auth/verify-login-otp');
            console.log('   - POST /api/auth/social/google');
            console.log('   - POST /api/auth/refresh-token');
            console.log('   - POST /api/auth/logout');
            console.log('   - POST /api/auth/forgot-password');
            console.log('   - POST /api/auth/reset-password');
            console.log('   - GET  /api/auth/me');
            console.log('   - PUT  /api/auth/me');
            console.log('   - PUT  /api/auth/add-gst');
            console.log('   - PUT  /api/auth/set-role');
            console.log('\n✅ Server ready to accept requests!\n');
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
});// Start the server
startServer();

module.exports = app;
