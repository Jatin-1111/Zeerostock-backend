const multer = require('multer');
const multerS3 = require('multer-s3');
const { S3Client } = require('@aws-sdk/client-s3');

/**
 * AWS S3 Client Configuration (SDK v3)
 * Credentials are automatically loaded from environment variables or IAM role
 */
const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'ap-south-1'
    // Credentials automatically resolved from:
    // 1. Environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
    // 2. EC2 Instance Profile (recommended for production)
});

/**
 * PRODUCTION-READY: Multer configuration with direct S3 streaming
 * 
 * CRITICAL CHANGES:
 * - Removed multer.memoryStorage() to prevent OOM crashes
 * - Streams files directly to S3 using multer-s3
 * - No server-side buffering = handles unlimited concurrent uploads
 * - File naming: timestamp + random string prevents overwrites
 * 
 * DEPLOYMENT:
 * - Nginx config in .ebextensions allows 100MB uploads
 * - Works with AWS Elastic Beanstalk out of the box
 */

/**
 * Helper function to determine folder path based on route/request
 * This runs during upload and can access req.user and req.body
 */
const getS3Folder = (req, file) => {
    const url = req.originalUrl || req.url;

    // For verification documents: verification-documents/{userId}/{documentType}
    if (url?.includes('verification') || req.body?.documentType) {
        const userId = req.user?.id || 'anonymous';
        const documentType = req.body?.documentType || 'general';
        return `verification-documents/${userId}/${documentType}`;
    }

    // For product images: products/{userId}
    if (url?.includes('listings') || url?.includes('products')) {
        const userId = req.user?.id || 'anonymous';
        return `products/${userId}`;
    }

    // Default: uploads/{userId}
    const userId = req.user?.id || 'anonymous';
    return `uploads/${userId}`;
};

const imageUploadConfig = multer({
    storage: multerS3({
        s3: s3Client,
        bucket: (req, file, cb) => {
            // Dynamic bucket selection based on upload type
            const url = req.originalUrl || req.url;

            if (url?.includes('verification')) {
                cb(null, process.env.AWS_VERIFICATION_BUCKET_NAME);
            } else if (url?.includes('products') || url?.includes('listings')) {
                cb(null, process.env.AWS_PRODUCTS_BUCKET_NAME);
            } else {
                cb(null, process.env.AWS_ASSETS_BUCKET_NAME);
            }
        },
        contentType: multerS3.AUTO_CONTENT_TYPE, // Auto-detect MIME type
        metadata: (req, file, cb) => {
            cb(null, {
                fieldName: file.fieldname,
                originalName: file.originalname,
                uploadedAt: new Date().toISOString(),
                userId: req.user?.id || 'anonymous',
                documentType: req.body?.documentType || 'general'
            });
        },
        key: (req, file, cb) => {
            // Generate folder path dynamically
            const folder = getS3Folder(req, file);

            // Generate unique filename: timestamp-randomString-originalName
            // Example: verification-documents/123/gst/1737331200000-abc123def456-certificate.pdf
            const timestamp = Date.now();
            const randomString = Math.random().toString(36).substring(2, 15);
            const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
            const uniqueFileName = `${timestamp}-${randomString}-${sanitizedName}`;

            const fullPath = `${folder}/${uniqueFileName}`;
            cb(null, fullPath);
        }
    }),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB per file
        files: 10 // Maximum 10 files per request
    },
    fileFilter: (req, file, cb) => {
        // Allow only image files (same as before)
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(file.originalname.toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (extname && mimetype) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files (JPEG, JPG, PNG, GIF, WEBP) are allowed'));
        }
    }
});

module.exports = {
    imageUploadConfig
};
