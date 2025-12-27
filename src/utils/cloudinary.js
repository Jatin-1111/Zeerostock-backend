const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Upload file to Cloudinary
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} fileName - Original file name
 * @param {string} folder - Cloudinary folder path
 * @returns {Promise<Object>} Upload result with secure_url
 */
const uploadToCloudinary = (fileBuffer, fileName, folder = 'verification-documents') => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: folder,
                resource_type: 'auto', // Automatically detect file type
                public_id: `${Date.now()}-${fileName.replace(/\.[^/.]+$/, '')}`, // Remove extension from public_id
                type: 'upload', // Make files publicly accessible
                // Don't force format - let Cloudinary detect it automatically
            },
            (error, result) => {
                if (error) {
                    console.error('Cloudinary upload error:', error);
                    reject(error);
                } else {
                    console.log('Cloudinary upload success:', result.secure_url);
                    resolve(result);
                }
            }
        );

        uploadStream.end(fileBuffer);
    });
};

/**
 * Delete file from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 * @returns {Promise<Object>} Deletion result
 */
const deleteFromCloudinary = async (publicId) => {
    return await cloudinary.uploader.destroy(publicId);
};

module.exports = {
    uploadToCloudinary,
    deleteFromCloudinary,
    cloudinary
};
