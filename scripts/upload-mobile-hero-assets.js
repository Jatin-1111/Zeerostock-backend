require('dotenv').config();
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');

const ASSETS_BUCKET = process.env.AWS_ASSETS_BUCKET_NAME || process.env.AWS_S3_BUCKET_NAME;
const REGION = process.env.AWS_REGION || 'ap-south-1';
const SOURCE_FOLDER = path.join(__dirname, '..', 'Mobile');
const S3_PREFIX = 'Assets/Mobile/';

if (!ASSETS_BUCKET) {
    console.error('❌ Missing AWS_ASSETS_BUCKET_NAME or AWS_S3_BUCKET_NAME in .env');
    process.exit(1);
}

const s3 = new S3Client({
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
    region: REGION,
});

const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp'];

function getContentType(fileName) {
    const ext = path.extname(fileName).toLowerCase();
    const contentTypes = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.webp': 'image/webp',
    };
    return contentTypes[ext] || 'application/octet-stream';
}

function slugifyFileName(fileName) {
    const ext = path.extname(fileName);
    const base = path.basename(fileName, ext);
    const slug = base
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
    return `${slug}${ext.toLowerCase()}`;
}

async function uploadFile(filePath, originalName) {
    const fileContent = fs.readFileSync(filePath);
    const normalizedName = slugifyFileName(originalName);
    const s3Key = `${S3_PREFIX}${normalizedName}`;
    const contentType = getContentType(originalName);

    const command = new PutObjectCommand({
        Bucket: ASSETS_BUCKET,
        Key: s3Key,
        Body: fileContent,
        ContentType: contentType,
    });

    await s3.send(command);

    const url = `https://${ASSETS_BUCKET}.s3.${REGION}.amazonaws.com/${s3Key}`;
    return {
        originalName,
        normalizedName,
        key: s3Key,
        url,
    };
}

async function uploadAll() {
    if (!fs.existsSync(SOURCE_FOLDER)) {
        console.error(`❌ Mobile folder not found: ${SOURCE_FOLDER}`);
        process.exit(1);
    }

    const files = fs.readdirSync(SOURCE_FOLDER);
    const imageFiles = files.filter((file) => imageExtensions.includes(path.extname(file).toLowerCase()));

    if (imageFiles.length === 0) {
        console.log('No image files found in Mobile folder.');
        return;
    }

    console.log(`Uploading ${imageFiles.length} images to ${ASSETS_BUCKET}...`);

    const results = [];
    for (const fileName of imageFiles) {
        const filePath = path.join(SOURCE_FOLDER, fileName);
        try {
            const result = await uploadFile(filePath, fileName);
            console.log(`✓ Uploaded: ${fileName} -> ${result.url}`);
            results.push(result);
        } catch (error) {
            console.error(`✗ Failed: ${fileName} -> ${error.message}`);
        }
    }

    const outputPath = path.join(__dirname, 'mobile-hero-urls.json');
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
    console.log(`\n✅ URLs saved to: ${outputPath}`);
}

uploadAll().catch((error) => {
    console.error('Upload failed:', error);
    process.exit(1);
});
