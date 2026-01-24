/**
 * Reorganize S3 bucket structure:
 * 1. Move all files in zeerostock-assets to Assets/ folder
 * 2. Copy Category Icons folder to zeerostock-assets
 * 3. Rename zeerostock-documents to zeerostock-productionucts (for product images only)
 */

require('dotenv').config();
const { S3Client, ListObjectsV2Command, CopyObjectCommand, DeleteObjectCommand, HeadBucketCommand, CreateBucketCommand, DeletePublicAccessBlockCommand, PutBucketPolicyCommand, PutBucketCorsCommand } = require('@aws-sdk/client-s3');
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

const ASSETS_BUCKET = 'zeerostock-assets';
const OLD_BUCKET = 'zeerostock-documents';
const PRODUCTS_BUCKET = 'zeerostock-productionucts';
const REGION = process.env.AWS_REGION || 'ap-south-1';

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
 * Copy object within same bucket or across buckets
 */
async function copyObject(sourceKey, sourceBucket, targetBucket, targetKey) {
    try {
        const command = new CopyObjectCommand({
            Bucket: targetBucket,
            CopySource: `${sourceBucket}/${encodeURIComponent(sourceKey)}`,
            Key: targetKey
        });
        await s3.send(command);
        return true;
    } catch (error) {
        console.error(`Error copying ${sourceKey}:`, error.message);
        return false;
    }
}

/**
 * Delete object from bucket
 */
async function deleteObject(bucketName, key) {
    try {
        const command = new DeleteObjectCommand({
            Bucket: bucketName,
            Key: key
        });
        await s3.send(command);
        return true;
    } catch (error) {
        console.error(`Error deleting ${key}:`, error.message);
        return false;
    }
}

/**
 * Create bucket if it doesn't exist
 */
async function createBucket(bucketName) {
    try {
        const headCommand = new HeadBucketCommand({ Bucket: bucketName });
        await s3.send(headCommand);
        console.log(`✅ Bucket '${bucketName}' already exists`);
        return true;
    } catch (error) {
        if (error.$metadata?.httpStatusCode === 404 || error.name === 'NotFound') {
            console.log(`📦 Creating bucket '${bucketName}'...`);
            try {
                const createCommand = new CreateBucketCommand({
                    Bucket: bucketName,
                    CreateBucketConfiguration: {
                        LocationConstraint: REGION
                    }
                });
                await s3.send(createCommand);
                console.log(`✅ Bucket '${bucketName}' created successfully`);
                return true;
            } catch (createError) {
                console.error(`❌ Error creating bucket '${bucketName}':`, createError.message);
                return false;
            }
        } else {
            console.error(`❌ Error checking bucket '${bucketName}':`, error.message);
            return false;
        }
    }
}

/**
 * Configure bucket for public access (for products bucket)
 */
async function makeProductsBucketPublic(bucketName) {
    console.log(`\n🔓 Configuring public access for '${bucketName}'...`);

    try {
        const command = new DeletePublicAccessBlockCommand({ Bucket: bucketName });
        await s3.send(command);
        console.log('✅ Public access block settings removed');
    } catch (error) {
        console.log('⚠️  Public access block:', error.message);
    }

    const bucketPolicy = {
        Version: '2012-10-17',
        Statement: [
            {
                Sid: 'PublicReadGetObject',
                Effect: 'Allow',
                Principal: '*',
                Action: 's3:GetObject',
                Resource: `arn:aws:s3:::${bucketName}/*`
            }
        ]
    };

    try {
        const policyCommand = new PutBucketPolicyCommand({
            Bucket: bucketName,
            Policy: JSON.stringify(bucketPolicy)
        });
        await s3.send(policyCommand);
        console.log('✅ Public read policy applied');
    } catch (error) {
        console.error('❌ Error setting bucket policy:', error.message);
    }

    const corsConfiguration = {
        CORSRules: [
            {
                AllowedHeaders: ['*'],
                AllowedMethods: ['GET', 'HEAD'],
                AllowedOrigins: ['*'],
                ExposeHeaders: ['ETag'],
                MaxAgeSeconds: 3000
            }
        ]
    };

    try {
        const corsCommand = new PutBucketCorsCommand({
            Bucket: bucketName,
            CORSConfiguration: corsConfiguration
        });
        await s3.send(corsCommand);
        console.log('✅ CORS configuration applied');
    } catch (error) {
        console.error('❌ Error setting CORS:', error.message);
    }
}

/**
 * Step 1: Move all files in zeerostock-assets to Assets/ folder
 */
async function moveToAssetsFolder() {
    console.log('\n📦 STEP 1: Moving files to Assets/ folder in zeerostock-assets');
    console.log('─────────────────────────────────────────────────');

    const objects = await listObjects(ASSETS_BUCKET);
    const rootFiles = objects.filter(obj => !obj.Key.includes('/'));

    if (rootFiles.length === 0) {
        console.log('⚠️  No root files found to move');
        return { success: 0, failed: 0 };
    }

    console.log(`Found ${rootFiles.length} files in root to move to Assets/ folder`);

    let successCount = 0;
    let failedCount = 0;

    for (const object of rootFiles) {
        const sourceKey = object.Key;
        const targetKey = `Assets/${sourceKey}`;

        // Copy to new location
        const copied = await copyObject(sourceKey, ASSETS_BUCKET, ASSETS_BUCKET, targetKey);

        if (copied) {
            // Delete from old location
            const deleted = await deleteObject(ASSETS_BUCKET, sourceKey);
            if (deleted) {
                successCount++;
                console.log(`✅ Moved: ${sourceKey} → Assets/${sourceKey}`);
            } else {
                failedCount++;
                console.log(`⚠️  Copied but failed to delete: ${sourceKey}`);
            }
        } else {
            failedCount++;
            console.log(`❌ Failed: ${sourceKey}`);
        }
    }

    return { success: successCount, failed: failedCount };
}

/**
 * Step 2: Copy Category Icons folder to zeerostock-assets
 */
async function copyCategoryIcons() {
    console.log('\n📦 STEP 2: Copying Category Icons to zeerostock-assets');
    console.log('─────────────────────────────────────────────────');

    const objects = await listObjects(OLD_BUCKET, 'Category Icons/');

    if (objects.length === 0) {
        console.log('⚠️  No Category Icons found');
        return { success: 0, failed: 0 };
    }

    console.log(`Found ${objects.length} category icons to copy`);

    let successCount = 0;
    let failedCount = 0;

    for (const object of objects) {
        const sourceKey = object.Key;
        const targetKey = sourceKey; // Keep same structure: Category Icons/...

        if (sourceKey === 'Category Icons/') continue; // Skip folder itself

        const success = await copyObject(sourceKey, OLD_BUCKET, ASSETS_BUCKET, targetKey);

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
 * Step 3: Create zeerostock-productionucts bucket and configure
 */
async function createProductsBucket() {
    console.log('\n📦 STEP 3: Creating zeerostock-productionucts bucket');
    console.log('─────────────────────────────────────────────────');
    console.log('⚠️  Note: You will need to manually rename zeerostock-documents');
    console.log('    to zeerostock-productionucts in AWS Console, or use AWS CLI:');
    console.log('    aws s3 mb s3://zeerostock-productionucts --region ap-south-1');
    console.log('    aws s3 sync s3://zeerostock-documents s3://zeerostock-productionucts');
    console.log('');

    const created = await createBucket(PRODUCTS_BUCKET);
    if (created) {
        await makeProductsBucketPublic(PRODUCTS_BUCKET);
    }

    return created;
}

/**
 * Generate new asset URLs
 */
async function generateAssetUrls() {
    console.log('\n📝 Generating updated asset URLs...');
    console.log('─────────────────────────────────────────────────');

    // Get Assets folder
    const assetsObjects = await listObjects(ASSETS_BUCKET, 'Assets/');
    const assetUrls = {};

    for (const object of assetsObjects) {
        if (object.Key === 'Assets/') continue;
        const fileName = path.basename(object.Key);
        const publicUrl = `https://${ASSETS_BUCKET}.s3.${REGION}.amazonaws.com/${object.Key}`;
        assetUrls[fileName] = publicUrl;
    }

    // Get Category Icons
    const categoryObjects = await listObjects(ASSETS_BUCKET, 'Category Icons/');
    const categoryUrls = {};

    for (const object of categoryObjects) {
        if (object.Key === 'Category Icons/') continue;
        const fileName = path.basename(object.Key);
        const publicUrl = `https://${ASSETS_BUCKET}.s3.${REGION}.amazonaws.com/${object.Key}`;
        categoryUrls[fileName] = publicUrl;
    }

    const output = {
        assets: assetUrls,
        categoryIcons: categoryUrls
    };

    const outputPath = path.join(__dirname, 'reorganized-asset-urls.json');
    await fs.writeFile(outputPath, JSON.stringify(output, null, 2));

    console.log(`✅ Asset URLs saved to: ${outputPath}`);
    console.log(`   - Assets: ${Object.keys(assetUrls).length} files`);
    console.log(`   - Category Icons: ${Object.keys(categoryUrls).length} files`);

    return output;
}

/**
 * Main reorganization function
 */
async function reorganize() {
    console.log('=================================================');
    console.log('      S3 Bucket Reorganization Script');
    console.log('=================================================\n');
    console.log('This script will:');
    console.log('1. Move all files in zeerostock-assets to Assets/ folder');
    console.log('2. Copy Category Icons to zeerostock-assets');
    console.log('3. Create zeerostock-productionucts bucket (for product images)');
    console.log('=================================================\n');

    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
        console.error('❌ AWS credentials not found in .env file');
        process.exit(1);
    }

    console.log('AWS Configuration:');
    console.log(`Region: ${REGION}`);
    console.log(`Access Key: ${process.env.AWS_ACCESS_KEY_ID.substring(0, 8)}...`);
    console.log('');

    try {
        // Step 1: Move to Assets folder
        const moveResult = await moveToAssetsFolder();

        // Step 2: Copy Category Icons
        const categoryResult = await copyCategoryIcons();

        // Step 3: Create products bucket
        await createProductsBucket();

        // Generate new URLs
        await generateAssetUrls();

        // Summary
        console.log('\n=================================================');
        console.log('✅ REORGANIZATION COMPLETED!');
        console.log('=================================================\n');
        console.log('Summary:');
        console.log(`Files moved to Assets/: ${moveResult.success} successful, ${moveResult.failed} failed`);
        console.log(`Category Icons copied: ${categoryResult.success} successful, ${categoryResult.failed} failed`);
        console.log('=================================================\n');
        console.log('Next Steps:');
        console.log('\n1. Update .env file:');
        console.log('   AWS_ASSETS_BUCKET_NAME=zeerostock-assets');
        console.log('   AWS_VERIFICATION_BUCKET_NAME=zeerostock-verification-documents');
        console.log('   AWS_PRODUCTS_BUCKET_NAME=zeerostock-productionucts');
        console.log('\n2. Migrate product images to zeerostock-productionucts bucket:');
        console.log('   - Use AWS Console or CLI to copy product images');
        console.log('   - Or keep them in zeerostock-documents and just rename the bucket');
        console.log('\n3. Update frontend code with new URLs from:');
        console.log('   scripts/reorganized-asset-urls.json');
        console.log('\n4. Update next.config.ts domains:');
        console.log('   - zeerostock-assets.s3.ap-south-1.amazonaws.com');
        console.log('   - zeerostock-productionucts.s3.ap-south-1.amazonaws.com');
        console.log('=================================================\n');

    } catch (error) {
        console.error('\n❌ Reorganization failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Run reorganization
reorganize();
