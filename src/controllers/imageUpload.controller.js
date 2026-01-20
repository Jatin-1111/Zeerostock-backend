const s3Service = require('../services/s3.service');
const { AppError, asyncHandler } = require('../middleware/error.middleware');

/**
 * @route   POST /api/supplier/listings/upload-images
 * @desc    Upload product images to S3
 * @access  Private (Supplier)
 */
const uploadImages = asyncHandler(async (req, res) => {
    // Check if files were uploaded
    if (!req.files || req.files.length === 0) {
        throw new AppError('No images uploaded', 400);
    }

    // Files are already uploaded to S3 by multer-s3 middleware
    // Each file object contains: location (URL), key (S3 key), bucket, etc.
    const uploadedImages = [];

    // Process each uploaded file
    for (const file of req.files) {
        try {
            // Generate presigned URL for secure access (optional)
            const presignedUrl = await s3Service.getPresignedUrl(file.key, 7 * 24 * 60 * 60, file.bucket); // 7 days

            uploadedImages.push({
                url: presignedUrl.url, // Presigned URL for secure access
                fileKey: file.key, // S3 key for future operations
                originalName: file.originalname,
                size: file.size,
                mimetype: file.mimetype
            });
        } catch (error) {
            console.error(`Error processing ${file.originalname}:`, error);
            // File is already in S3, just log the error for presigned URL generation
        }
    }

    // Return response with uploaded images
    res.status(200).json({
        success: true,
        message: `${uploadedImages.length} image(s) uploaded successfully`,
        data: {
            images: uploadedImages,
            uploadedCount: uploadedImages.length,
            totalCount: req.files.length
        }
    });
});

/**
 * @route   DELETE /api/supplier/listings/delete-image
 * @desc    Delete product image from S3
 * @access  Private (Supplier)
 */
const deleteImage = asyncHandler(async (req, res) => {
    const { fileKey } = req.body;

    // Validate fileKey
    if (!fileKey) {
        throw new AppError('File key is required', 400);
    }

    // Check if S3 is configured
    if (!s3Service.isConfigured()) {
        throw new AppError('S3 service is not configured', 500);
    }

    try {
        // Determine bucket based on fileKey prefix
        let bucket;
        if (fileKey.startsWith('products/')) {
            bucket = process.env.AWS_PRODUCTS_BUCKET_NAME;
        } else if (fileKey.startsWith('verification-documents/')) {
            bucket = process.env.AWS_VERIFICATION_BUCKET_NAME;
        } else {
            bucket = process.env.AWS_ASSETS_BUCKET_NAME;
        }

        // Delete from S3
        await s3Service.deleteFile(fileKey, bucket);

        res.status(200).json({
            success: true,
            message: 'Image deleted successfully',
            data: {
                fileKey
            }
        });
    } catch (error) {
        console.error('Error deleting image:', error);
        throw new AppError(`Failed to delete image: ${error.message}`, 500);
    }
});

module.exports = {
    uploadImages,
    deleteImage
};
