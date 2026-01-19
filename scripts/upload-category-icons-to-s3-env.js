/**
 * Upload Category Icons to S3 - Alternative with Direct ENV Setup
 * 
 * If you don't want to use .env file, you can set credentials directly here
 * or pass them as environment variables when running the script.
 * 
 * Usage:
 * Option 1: AWS_ACCESS_KEY_ID=xxx AWS_SECRET_ACCESS_KEY=yyy AWS_S3_BUCKET_NAME=zzz node scripts/upload-category-icons-to-s3-env.js
 * Option 2: Edit the credentials below and run: node scripts/upload-category-icons-to-s3-env.js
 */

const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');

// OPTION: Set credentials directly here (NOT recommended for production)
const config = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'YOUR_ACCESS_KEY_HERE',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'YOUR_SECRET_KEY_HERE',
    region: process.env.AWS_REGION || 'us-east-1',
    bucketName: process.env.AWS_S3_BUCKET_NAME || 'YOUR_BUCKET_NAME_HERE'
};

// Configure AWS SDK
const s3 = new S3Client({
    credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey
    },
    region: config.region
});

const BUCKET_NAME = config.bucketName;
const CATEGORY_ICONS_FOLDER = path.join(__dirname, '..', 'Category icons');
const S3_FOLDER_PREFIX = 'Category Icons/';

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
        const url = `https://${BUCKET_NAME}.s3.${config.region}.amazonaws.com/${s3Key}`;
        console.log(`✓ Uploaded: ${categoryName}.png -> ${url}`);
        return { categoryName, url };
    } catch (error) {
        console.error(`✗ Failed to upload ${fileName}:`, error.message);
        throw error;
    }
}

async function uploadAll() {
    console.log('🚀 Uploading Category Icons to S3...\n');

    if (!fs.existsSync(CATEGORY_ICONS_FOLDER)) {
        console.error(`❌ Error: Folder not found at ${CATEGORY_ICONS_FOLDER}`);
        process.exit(1);
    }

    const files = fs.readdirSync(CATEGORY_ICONS_FOLDER)
        .filter(file => file.toLowerCase().endsWith('.png'));

    if (files.length === 0) {
        console.error('❌ No PNG files found');
        process.exit(1);
    }

    console.log(`Found ${files.length} icons\n`);

    const results = [];
    for (const file of files) {
        try {
            const result = await uploadFileToS3(path.join(CATEGORY_ICONS_FOLDER, file), file);
            results.push(result);
        } catch (error) {
            console.error(`✗ Failed: ${file} - ${error.message}`);
        }
    }

    console.log('\n' + '='.repeat(70));
    console.log('📋 COPY THIS INTO CategorySection.tsx:');
    console.log('='.repeat(70) + '\n');
    console.log('const categories = [');
    results.forEach(({ categoryName, url }) => {
        console.log(`  { name: "${categoryName}", iconUrl: "${url}" },`);
    });
    console.log('];\n');
    console.log('='.repeat(70));
    console.log(`✅ Uploaded ${results.length} icons successfully!`);
}

uploadAll().catch(error => {
    console.error('❌ Error:', error.message);
    process.exit(1);
});
