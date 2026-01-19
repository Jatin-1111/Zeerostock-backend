/**
 * Migrate files from zeerostock-documents to new bucket structure
 * - Assets → zeerostock-assets (public)
 * - verification-documents → zeerostock-verification-documents (private)
 */

require('dotenv').config();
const { S3Client, ListObjectsV2Command, CopyObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs').promises;
const path = require('path');

// Configure AWS SDK
const s3 = new S3Client({
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    },
    region: process.env.AWS_REGION || 'ap-south-1'
});

const OLD_BUCKET = 'zeerostock-documents';
const ASSETS_BUCKET = 'zeerostock-assets';
const VERIFICATION_BUCKET = 'zeerostock-verification-documents';

/**
 * List all objects in a bucket with a specific prefix
 */
async function listObjects(bucketName, prefix = '') {
    try {
        const params = {
            Bucket: bucketName,
            Prefix: prefix
        };

        let allObjects = [];
        let continuationToken = null;

        do {
            if (continuationToken) {
                params.ContinuationToken = continuationToken;
            }

            const command = new ListObjectsV2Command(params);
            const response = await s3.send(command);

            if (response.Contents) {
                allObjects = allObjects.concat(response.Contents);
            }

            continuationToken = response.IsTruncated ? response.NextContinuationToken : null;
        } while (continuationToken);

        return allObjects;
    } catch (error) {
        console.error(`Error listing objects in ${bucketName}/${prefix}:`, error.message);
        return [];
    }
}

/**
 * Copy object from source to destination bucket
 * Note: We don't set ACLs because the bucket policy handles public access
 */
async function copyObject(sourceKey, sourceBucket, targetBucket, targetKey, makePublic = false) {
    try {
        const copyParams = {
            Bucket: targetBucket,
            CopySource: `${sourceBucket}/${sourceKey}`,
            Key: targetKey
        };

        // Don't use ACL - bucket policy handles public access
        // Modern S3 buckets have ACLs disabled by default

        const command = new CopyObjectCommand(copyParams);
        await s3.send(command);
        return true;
    } catch (error) {
        console.error(`Error copying ${sourceKey}:`, error.message);
        return false;
    }
}

/**
 * Migrate Assets folder to public bucket
 */
async function migrateAssets() {
    console.log('\n📦 Migrating Assets to zeerostock-assets...');
    console.log('─────────────────────────────────────────────────');

    const objects = await listObjects(OLD_BUCKET, 'Assets/');

    if (objects.length === 0) {
        console.log('⚠️  No assets found to migrate');
        return { success: 0, failed: 0 };
    }

    console.log(`Found ${objects.length} assets to migrate`);

    let successCount = 0;
    let failedCount = 0;

    for (const object of objects) {
        const sourceKey = object.Key;
        // Remove "Assets/" prefix for the new bucket
        const targetKey = sourceKey.replace('Assets/', '');

        if (!targetKey) continue; // Skip if it's the folder itself

        const success = await copyObject(sourceKey, OLD_BUCKET, ASSETS_BUCKET, targetKey, true);

        if (success) {
            successCount++;
            console.log(`✅ ${sourceKey} → ${ASSETS_BUCKET}/${targetKey}`);
        } else {
            failedCount++;
            console.log(`❌ Failed: ${sourceKey}`);
        }
    }

    return { success: successCount, failed: failedCount };
}

/**
 * Migrate verification documents to private bucket
 */
async function migrateVerificationDocuments() {
    console.log('\n📦 Migrating Verification Documents to zeerostock-verification-documents...');
    console.log('─────────────────────────────────────────────────');

    const objects = await listObjects(OLD_BUCKET, 'verification-documents/');

    if (objects.length === 0) {
        console.log('⚠️  No verification documents found to migrate');
        return { success: 0, failed: 0 };
    }

    console.log(`Found ${objects.length} verification documents to migrate`);

    let successCount = 0;
    let failedCount = 0;

    for (const object of objects) {
        const sourceKey = object.Key;
        // Keep the same structure in the new bucket
        const targetKey = sourceKey;

        const success = await copyObject(sourceKey, OLD_BUCKET, VERIFICATION_BUCKET, targetKey, false);

        if (success) {
            successCount++;
            console.log(`✅ ${sourceKey} → ${VERIFICATION_BUCKET}/${targetKey}`);
        } else {
            failedCount++;
            console.log(`❌ Failed: ${sourceKey}`);
        }
    }

    return { success: successCount, failed: failedCount };
}

/**
 * Generate new asset URLs and save to file
 */
async function generateAssetUrls() {
    console.log('\n📝 Generating new public asset URLs...');
    console.log('─────────────────────────────────────────────────');

    const objects = await listObjects(ASSETS_BUCKET);
    const assetUrls = {};

    for (const object of objects) {
        const fileName = path.basename(object.Key);
        const publicUrl = `https://${ASSETS_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${object.Key}`;
        assetUrls[fileName] = publicUrl;
    }

    const outputPath = path.join(__dirname, 'new-asset-urls.json');
    await fs.writeFile(outputPath, JSON.stringify(assetUrls, null, 2));

    console.log(`✅ Asset URLs saved to: ${outputPath}`);
    console.log(`Total assets: ${Object.keys(assetUrls).length}`);

    return assetUrls;
}

/**
 * Main migration function
 */
async function migrate() {
    console.log('=================================================');
    console.log('      S3 Buckets Migration Script');
    console.log('=================================================\n');
    console.log('This script will migrate files from:');
    console.log(`  ${OLD_BUCKET}/Assets → ${ASSETS_BUCKET}`);
    console.log(`  ${OLD_BUCKET}/verification-documents → ${VERIFICATION_BUCKET}`);
    console.log('=================================================\n');

    // Validate environment
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
        console.error('❌ AWS credentials not found in .env file');
        process.exit(1);
    }

    console.log('AWS Configuration:');
    console.log(`Region: ${process.env.AWS_REGION || 'ap-south-1'}`);
    console.log(`Access Key: ${process.env.AWS_ACCESS_KEY_ID.substring(0, 8)}...`);
    console.log('');

    try {
        // Migrate assets
        const assetsResult = await migrateAssets();

        // Migrate verification documents
        const docsResult = await migrateVerificationDocuments();

        // Generate new asset URLs
        await generateAssetUrls();

        // Summary
        console.log('\n=================================================');
        console.log('✅ MIGRATION COMPLETED!');
        console.log('=================================================\n');
        console.log('Summary:');
        console.log(`Assets migrated: ${assetsResult.success} successful, ${assetsResult.failed} failed`);
        console.log(`Verification docs migrated: ${docsResult.success} successful, ${docsResult.failed} failed`);
        console.log('=================================================\n');
        console.log('Next Steps:');
        console.log('1. Update .env file:');
        console.log(`   AWS_ASSETS_BUCKET_NAME=${ASSETS_BUCKET}`);
        console.log(`   AWS_VERIFICATION_BUCKET_NAME=${VERIFICATION_BUCKET}`);
        console.log('\n2. Replace old S3 URLs in your code with new ones from:');
        console.log('   scripts/new-asset-urls.json');
        console.log('\n3. Update next.config.ts to use new bucket domain:');
        console.log(`   hostname: "${ASSETS_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com"`);
        console.log('\n4. After verifying everything works, you can delete files from the old bucket');
        console.log('=================================================\n');

    } catch (error) {
        console.error('\n❌ Migration failed:', error.message);
        process.exit(1);
    }
}

// Run migration
migrate();
