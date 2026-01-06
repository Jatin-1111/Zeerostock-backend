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

    // Check if S3 is configured
    if (!s3Service.isConfigured()) {
        throw new AppError('S3 service is not configured', 500);
    }

    const uploadedImages = [];
    const errors = [];

    // Upload each file to S3
    for (const file of req.files) {
        try {
            const result = await s3Service.uploadFile(
                file.buffer,
                file.originalname,
                file.mimetype,
                'products' // Store in products folder
            );

            uploadedImages.push({
                url: result.url,
                fileKey: result.fileKey,
                originalName: file.originalname
            });
        } catch (error) {
            console.error(`Error uploading ${file.originalname}:`, error);
            errors.push({
                file: file.originalname,
                error: error.message
            });
        }
    }

    // Return response with uploaded images and any errors
    res.status(200).json({
        success: true,
        message: `${uploadedImages.length} image(s) uploaded successfully`,
        data: {
            images: uploadedImages,
            uploadedCount: uploadedImages.length,
            totalCount: req.files.length,
            ...(errors.length > 0 && { errors })
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
        // Delete from S3
        await s3Service.deleteFile(fileKey);

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
