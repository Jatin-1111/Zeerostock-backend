/**
 * Standalone Script to Upload All Assets to AWS S3
 * 
 * This script uploads all asset images from the "assets" folder
 * to an AWS S3 bucket under an "Assets" folder.
 * 
 * Usage:
 * 1. Ensure you have AWS credentials configured in your .env file
 * 2. Run: node scripts/upload-assets-to-s3.js
 */

require('dotenv').config();
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { GetObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');

// Configure AWS SDK
const s3 = new S3Client({
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    },
    region: process.env.AWS_REGION || 'ap-south-1'
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;
const ASSETS_FOLDER = path.join(__dirname, '..', 'assets');
const S3_FOLDER_PREFIX = 'Assets/';

// Get content type based on file extension
function getContentType(fileName) {
    const ext = path.extname(fileName).toLowerCase();
    const contentTypes = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.webp': 'image/webp',
        '.ico': 'image/x-icon'
    };
    return contentTypes[ext] || 'application/octet-stream';
}

/**
 * Upload a single file to S3
 */
async function uploadFileToS3(filePath, fileName) {
    const fileContent = fs.readFileSync(filePath);
    const s3Key = `${S3_FOLDER_PREFIX}${fileName}`;
    const contentType = getContentType(fileName);

    const params = {
        Bucket: BUCKET_NAME,
        Key: s3Key,
        Body: fileContent,
        ContentType: contentType
    };

    try {
        const command = new PutObjectCommand(params);
        const result = await s3.send(command);
        const location = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'ap-south-1'}.amazonaws.com/${s3Key}`;
        console.log(`✓ Uploaded: ${fileName} -> ${location}`);
        return {
            fileName,
            url: location,
            key: s3Key
        };
    } catch (error) {
        console.error(`✗ Failed to upload ${fileName}:`, error.message);
        throw error;
    }
}

/**
 * Generate presigned URL for a file
 */
async function generatePresignedUrl(s3Key, expiresIn = 604800) { // 7 days default
    const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: s3Key
    });

    try {
        const url = await getSignedUrl(s3, command, { expiresIn });
        return url;
    } catch (error) {
        console.error(`✗ Failed to generate presigned URL for ${s3Key}:`, error.message);
        throw error;
    }
}

/**
 * Main function to upload all assets
 */
async function uploadAllAssets() {
    console.log('Starting asset upload to S3...\n');
    console.log(`Bucket: ${BUCKET_NAME}`);
    console.log(`Source Folder: ${ASSETS_FOLDER}`);
    console.log(`S3 Prefix: ${S3_FOLDER_PREFIX}\n`);

    // Check if assets folder exists
    if (!fs.existsSync(ASSETS_FOLDER)) {
        console.error(`Error: Assets folder not found at ${ASSETS_FOLDER}`);
        process.exit(1);
    }

    // Get all files from assets folder
    const files = fs.readdirSync(ASSETS_FOLDER);

    // Filter only image files
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.ico'];
    const imageFiles = files.filter(file => {
        const ext = path.extname(file).toLowerCase();
        return imageExtensions.includes(ext);
    });

    if (imageFiles.length === 0) {
        console.log('No image files found in assets folder.');
        return;
    }

    console.log(`Found ${imageFiles.length} image files to upload.\n`);

    const uploadResults = [];
    const presignedUrls = {};

    // Upload each file
    for (const fileName of imageFiles) {
        const filePath = path.join(ASSETS_FOLDER, fileName);

        try {
            const result = await uploadFileToS3(filePath, fileName);
            uploadResults.push(result);

            // Generate presigned URL
            const presignedUrl = await generatePresignedUrl(result.key);
            presignedUrls[fileName] = presignedUrl;

        } catch (error) {
            console.error(`Failed to process ${fileName}`);
        }
    }

    // Save presigned URLs to a JSON file for reference
    const urlsFilePath = path.join(__dirname, 'asset-urls.json');
    fs.writeFileSync(urlsFilePath, JSON.stringify(presignedUrls, null, 2));
    console.log(`\n✓ Presigned URLs saved to: ${urlsFilePath}`);

    console.log('\n=== Upload Summary ===');
    console.log(`Total files uploaded: ${uploadResults.length}/${imageFiles.length}`);
    console.log('\nUpload complete!');
}

// Run the upload
if (require.main === module) {
    uploadAllAssets()
        .then(() => {
            console.log('\nScript completed successfully!');
            process.exit(0);
        })
        .catch(error => {
            console.error('\nScript failed:', error);
            process.exit(1);
        });
}

module.exports = { uploadAllAssets, generatePresignedUrl };
