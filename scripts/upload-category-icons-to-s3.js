/**
 * Standalone Script to Upload Category Icons to AWS S3
 * 
 * This script uploads all category icon images from the "Category icons" folder
 * to an AWS S3 bucket under a "Category Icons" folder.
 * 
 * Usage:
 * 1. Ensure you have AWS credentials configured in your .env file
 * 2. Run: node scripts/upload-category-icons-to-s3.js
 */

require('dotenv').config();
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');

// Configure AWS SDK
const s3 = new S3Client({
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    },
    region: process.env.AWS_REGION || 'us-east-1'
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;
const CATEGORY_ICONS_FOLDER = path.join(__dirname, '..', 'Category icons');
const S3_FOLDER_PREFIX = 'Category Icons/';

// Category name mapping - normalizes filenames to match the frontend categories
const categoryMapping = {
    'Electronic .png': 'Electronics',
    'Industrial .png': 'Industrial',
    'Construction .png': 'Construction',
    'Agricultural .png': 'Agriculture',
    'Cosmetic .png': 'Cosmetics',
    'Appliances .png': 'Appliances',
    'Hand Tools.png': 'Hand Tools',
    'Decors.png': 'Decor',
    'Cleaning Items.png': 'Cleaning items',
    'Fasteners.png': 'Fasteners',
    'Plumbing.png': 'Plumbing Materials',
    'Electrical.png': 'Electricals',
    'Power Tool.png': 'Power Tools',
    'PPE.png': 'PPE',
    'Abrasive.png': 'Abrasives',
    'Chisels & Drill bits.png': 'Chisels & Drill bits',
    'Food Containers.png': 'Food Containers'
};

/**
 * Upload a single file to S3
 */
async function uploadFileToS3(filePath, fileName) {
    const fileContent = fs.readFileSync(filePath);
    const categoryName = categoryMapping[fileName] || fileName.replace('.png', '');
    const s3Key = `${S3_FOLDER_PREFIX}${categoryName}.png`;

    const params = {
        Bucket: BUCKET_NAME,
        Key: s3Key,
        Body: fileContent,
        ContentType: 'image/png'
        // Removed ACL - bucket should be configured for public access via bucket policy
    };

    try {
        const command = new PutObjectCommand(params);
        const result = await s3.send(command);
        const url = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${s3Key}`;
        console.log(`✓ Uploaded: ${categoryName}.png -> ${url}`);
        return {
            categoryName,
            url
        };
    } catch (error) {
        console.error(`✗ Failed to upload ${fileName}:`, error.message);
        throw error;
    }
}

/**
 * Main function to upload all category icons
 */
async function uploadAllCategoryIcons() {
    console.log('🚀 Starting Category Icons Upload to S3...\n');
    console.log(`Bucket: ${BUCKET_NAME}`);
    console.log(`Region: ${process.env.AWS_REGION || 'us-east-1'}`);
    console.log(`Source Folder: ${CATEGORY_ICONS_FOLDER}\n`);

    // Verify AWS credentials
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
        console.error('❌ Error: AWS credentials not found in .env file');
        console.error('Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY');
        process.exit(1);
    }

    if (!BUCKET_NAME) {
        console.error('❌ Error: AWS_S3_BUCKET_NAME not found in .env file');
        process.exit(1);
    }

    // Check if Category icons folder exists
    if (!fs.existsSync(CATEGORY_ICONS_FOLDER)) {
        console.error(`❌ Error: Category icons folder not found at ${CATEGORY_ICONS_FOLDER}`);
        process.exit(1);
    }

    // Get all PNG files from the Category icons folder
    const files = fs.readdirSync(CATEGORY_ICONS_FOLDER)
        .filter(file => file.toLowerCase().endsWith('.png'));

    if (files.length === 0) {
        console.error('❌ Error: No PNG files found in Category icons folder');
        process.exit(1);
    }

    console.log(`Found ${files.length} category icon(s) to upload\n`);

    const uploadResults = [];
    const errors = [];

    // Upload each file
    for (const file of files) {
        const filePath = path.join(CATEGORY_ICONS_FOLDER, file);
        try {
            const result = await uploadFileToS3(filePath, file);
            uploadResults.push(result);
        } catch (error) {
            errors.push({ file, error: error.message });
        }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Upload Summary:');
    console.log('='.repeat(60));
    console.log(`✓ Successfully uploaded: ${uploadResults.length}`);
    console.log(`✗ Failed: ${errors.length}`);
    console.log('='.repeat(60));

    if (uploadResults.length > 0) {
        console.log('\n✅ COPY AND PASTE THIS INTO CategorySection.tsx:');
        console.log('\n// Replace the categories array with this:\nconst categories = [');
        uploadResults.forEach(({ categoryName, url }) => {
            console.log(`  { name: "${categoryName}", iconUrl: "${url}" },`);
        });
        console.log('];\n');
    }

    if (errors.length > 0) {
        console.log('\n❌ Failed Uploads:');
        errors.forEach(({ file, error }) => {
            console.log(`  - ${file}: ${error}`);
        });
    }

    console.log('\n🎉 Upload process completed!');
}

// Run the upload process
uploadAllCategoryIcons()
    .then(() => {
        console.log('\n✨ All done!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Fatal error:', error.message);
        process.exit(1);
    });
