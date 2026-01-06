const multer = require('multer');

/**
 * Multer configuration for image uploads
 * Uses memory storage for processing files before uploading to S3
 */
const imageUploadConfig = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB per file
        files: 10 // Maximum 10 files per request
    },
    fileFilter: (req, file, cb) => {
        // Allow only image files
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
