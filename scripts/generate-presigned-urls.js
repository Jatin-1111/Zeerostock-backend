/**
 * Generate presigned URLs for Category Icons
 * These URLs will work even if bucket is private
 * URLs expire after 7 days by default
 */

require('dotenv').config();
const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');

const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'us-east-1',
    signatureVersion: 'v4'
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;
const S3_FOLDER_PREFIX = 'Assets/';

// Expiry time in seconds (7 days = 604800 seconds)
const EXPIRES_IN = 604800;

const categories = [
    'Electronics', 'Industrial', 'Construction', 'Agriculture', 'Cosmetics',
    'Appliances', 'Hand Tools', 'Decor', 'Cleaning items', 'Fasteners',
    'Plumbing Materials', 'Electricals', 'Power Tools', 'PPE', 'Abrasives',
    'Chisels & Drill bits', 'Food Containers'
];

async function generatePresignedUrls() {
    console.log('🔗 Generating presigned URLs for Category Icons...\n');
    console.log(`Bucket: ${BUCKET_NAME}`);
    console.log(`Expiry: 7 days\n`);

    const results = [];

    for (const category of categories) {
        const key = `${S3_FOLDER_PREFIX}${category}.png`;

        const url = s3.getSignedUrl('getObject', {
            Bucket: BUCKET_NAME,
            Key: key,
            Expires: EXPIRES_IN
        });

        results.push({ name: category, url });
        console.log(`✓ Generated URL for: ${category}`);
    }

    console.log('\n' + '='.repeat(70));
    console.log('📋 COPY THIS INTO CategorySection.tsx:');
    console.log('='.repeat(70) + '\n');
    console.log('const categories = [');
    results.forEach(({ name, url }) => {
        console.log(`  { name: "${name}", iconUrl: "${url}" },`);
    });
    console.log('];\n');
    console.log('='.repeat(70));
    console.log('⚠️  Note: These URLs expire in 7 days');
    console.log('💡 To fix permanently: Disable Block Public Access in S3 Console');
    console.log('='.repeat(70));
}

generatePresignedUrls().catch(error => {
    console.error('❌ Error:', error.message);
    process.exit(1);
});
