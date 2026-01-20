const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const crypto = require('crypto');
const path = require('path');

class S3Service {
    constructor() {
        this.s3Client = new S3Client({
            region: process.env.AWS_REGION,
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            },
        });
        this.bucketName = process.env.AWS_S3_BUCKET_NAME;
    }

    /**
     * Generate a unique filename
     */
    generateFileName(originalName, folder = '') {
        const timestamp = Date.now();
        const randomString = crypto.randomBytes(8).toString('hex');
        const ext = path.extname(originalName);
        const nameWithoutExt = path.basename(originalName, ext);
        const sanitizedName = nameWithoutExt.replace(/[^a-zA-Z0-9]/g, '_');

        const fileName = `${sanitizedName}_${timestamp}_${randomString}${ext}`;
        return folder ? `${folder}/${fileName}` : fileName;
    }

    /**
     * Upload file to S3
     * @param {Buffer} fileBuffer - File buffer
     * @param {string} originalName - Original filename
     * @param {string} mimeType - MIME type of the file
     * @param {string} folder - S3 folder path
     * @returns {Promise<Object>} Upload result with URL and key
     */
    async uploadFile(fileBuffer, originalName, mimeType, folder = 'documents') {
        try {
            const fileKey = this.generateFileName(originalName, folder);

            const command = new PutObjectCommand({
                Bucket: this.bucketName,
                Key: fileKey,
                Body: fileBuffer,
                ContentType: mimeType,
                ServerSideEncryption: 'AES256',
                // Make files private by default - use presigned URLs for access
            });

            await this.s3Client.send(command);

            // Generate a presigned URL that expires in 7 days for initial access
            const url = await this.getPresignedUrl(fileKey, 7 * 24 * 60 * 60);

            return {
                success: true,
                fileKey,
                url: url.url,
                bucket: this.bucketName,
                region: process.env.AWS_REGION,
            };
        } catch (error) {
            console.error('S3 upload error:', error);
            throw new Error(`Failed to upload file to S3: ${error.message}`);
        }
    }

    /**
     * Delete file from S3
     * @param {string} fileKey - S3 object key
     * @returns {Promise<Object>} Deletion result
     */
    async deleteFile(fileKey, bucket = null) {
        try {
            const command = new DeleteObjectCommand({
                Bucket: bucket || this.bucketName,
                Key: fileKey,
            });

            await this.s3Client.send(command);

            return {
                success: true, // We successfully sent the command
                message: 'File deleted successfully',
            };
        } catch (error) {
            console.error('S3 delete error:', error);
            throw new Error(`Failed to delete file from S3: ${error.message}`);
        }
    }

    /**
     * Generate presigned URL for temporary access
     * @param {string} fileKey - S3 object key
     * @param {number} expiresIn - Expiration time in seconds (default: 1 hour)
     * @returns {Promise<Object>} Presigned URL
     */
    async getPresignedUrl(fileKey, expiresIn = 3600, bucket = null) {
        try {
            const command = new GetObjectCommand({
                Bucket: bucket || this.bucketName,
                Key: fileKey,
            });

            const url = await getSignedUrl(this.s3Client, command, { expiresIn });

            return {
                success: true,
                url,
                expiresIn,
            };
        } catch (error) {
            console.error('S3 presigned URL error:', error);
            throw new Error(`Failed to generate presigned URL: ${error.message}`);
        }
    }

    /**
     * Extract file key from S3 URL
     * @param {string} url - S3 URL
     * @returns {string|null} File key or null if invalid
     */
    extractFileKeyFromUrl(url) {
        try {
            // Handle presigned URLs
            const urlObj = new URL(url);
            const pathname = urlObj.pathname;
            return pathname.startsWith('/') ? pathname.substring(1) : pathname;
        } catch (error) {
            console.error('Error extracting file key:', error);
            return null;
        }
    }

    /**
     * Check if S3 is properly configured
     * @returns {boolean} True if configured
     */
    isConfigured() {
        return !!(
            process.env.AWS_ACCESS_KEY_ID &&
            process.env.AWS_SECRET_ACCESS_KEY &&
            process.env.AWS_REGION &&
            (process.env.AWS_S3_BUCKET_NAME ||
                process.env.AWS_PRODUCTS_BUCKET_NAME ||
                process.env.AWS_ASSETS_BUCKET_NAME)
        );
    }
}

module.exports = new S3Service();
