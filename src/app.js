const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth.routes');
const homepageRoutes = require('./routes/homepage.routes');
const marketplaceRoutes = require('./routes/marketplace.routes');
const searchRoutes = require('./routes/search.routes');
const productDetailRoutes = require('./routes/productDetail.routes');
const cartRoutes = require('./routes/cart.routes');
const buyerRoutes = require('./routes/buyer.routes');
const rfqRoutes = require('./routes/rfq.routes');
const quoteRoutes = require('./routes/quote.routes');
const settingsRoutes = require('./routes/settings.routes');
const roleRoutes = require('./routes/role.routes');
const adminRoutes = require('./routes/admin.routes');
const adminManagementRoutes = require('./routes/adminManagement.routes');
const userManagementRoutes = require('./routes/userManagement.routes');
const supplierVerificationRoutes = require('./routes/supplierVerification.routes');
const supplierRoutes = require('./routes/supplier.routes');
const feedbackRoutes = require('./routes/feedback.routes');
const bugRoutes = require('./routes/bug.routes');

// Import middleware
const { errorHandler, notFound } = require('./middleware/error.middleware');

// Initialize Express app
const app = express();

// Trust proxy - required for ALB to work correctly with X-Forwarded headers
if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
}

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
    allowedHeaders: ['Content-Type', 'Authorization'],
    ExposeHeaders: ["ETag"]
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
            roles: '/api/roles',
            admin: '/api/admin',
            homepage: '/api/homepage',
            marketplace: '/api/marketplace',
            search: '/api/search',
            products: '/api/products',
            cart: '/api/cart',
            buyer: '/api/buyer',
            rfq: '/api/rfq',
            quotes: '/api/quotes',
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
app.use('/api/roles', roleRoutes);
app.use('/api/users', userManagementRoutes); // User management routes
app.use('/api/admins', adminManagementRoutes); // Admin management routes
app.use('/api/admin', adminRoutes); // Admin operations (supplier verification, etc.)
app.use('/api/homepage', homepageRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/products', productDetailRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/buyer', buyerRoutes);
app.use('/api/rfq', rfqRoutes);
app.use('/api/quotes', quoteRoutes);
app.use('/api/buyer/settings', settingsRoutes);
app.use('/api/supplier/verification', supplierVerificationRoutes);
app.use('/api/supplier', supplierRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/bugs', bugRoutes);

// Health check endpoint for AWS Elastic Beanstalk
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        message: 'Zeerostock Backend is running',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Alternative health check at root for EB
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

module.exports = app;
