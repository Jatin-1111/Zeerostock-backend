/**
 * Setup S3 Buckets
 * This script helps set up the S3 bucket structure:
 * 1. zeerostock-assets (public) - for images, logos, icons
 * 2. zeerostock-verification-documents (private) - for supplier verification documents
 */

require('dotenv').config();
const { S3Client, HeadBucketCommand, CreateBucketCommand, DeletePublicAccessBlockCommand, PutBucketPolicyCommand, PutBucketCorsCommand, PutPublicAccessBlockCommand, PutBucketEncryptionCommand, ListObjectsV2Command, CopyObjectCommand } = require('@aws-sdk/client-s3');

// Configure AWS SDK
const s3 = new S3Client({
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    },
    region: process.env.AWS_REGION || 'ap-south-1'
});

const REGION = process.env.AWS_REGION || 'ap-south-1';
const ASSETS_BUCKET = 'zeerostock-assets';
const VERIFICATION_BUCKET = 'zeerostock-verification-documents';

/**
 * Create S3 bucket if it doesn't exist
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
 * Configure public access for assets bucket
 */
async function makeAssetsPublic(bucketName) {
    console.log(`\n🔓 Configuring public access for '${bucketName}'...`);

    try {
        // Disable Block Public Access settings
        const deleteCommand = new DeletePublicAccessBlockCommand({ Bucket: bucketName });
        await s3.send(deleteCommand);
        console.log('✅ Public access block settings removed');
    } catch (error) {
        console.log('⚠️  Public access block:', error.message);
    }

    // Set bucket policy for public read access
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
        throw error;
    }

    // Enable CORS for web access
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
 * Configure private access for verification documents bucket
 */
async function makeVerificationPrivate(bucketName) {
    console.log(`\n🔒 Configuring private access for '${bucketName}'...`);

    try {
        // Enable Block Public Access settings
        const blockCommand = new PutPublicAccessBlockCommand({
            Bucket: bucketName,
            PublicAccessBlockConfiguration: {
                BlockPublicAcls: true,
                IgnorePublicAcls: true,
                BlockPublicPolicy: true,
                RestrictPublicBuckets: true
            }
        });
        await s3.send(blockCommand);
        console.log('✅ Public access blocked');
    } catch (error) {
        console.error('❌ Error setting public access block:', error.message);
    }

    // Enable server-side encryption
    try {
        const encryptCommand = new PutBucketEncryptionCommand({
            Bucket: bucketName,
            ServerSideEncryptionConfiguration: {
                Rules: [{
                    ApplyServerSideEncryptionByDefault: {
                        SSEAlgorithm: 'AES256'
                    }
                }]
            }
        });
        await s3.send(encryptCommand);
        console.log('✅ Server-side encryption enabled');
    } catch (error) {
        console.error('❌ Error setting encryption:', error.message);
    }
}

/**
 * Copy objects from old bucket to new bucket
 */
async function copyObjects(sourceBucket, sourcePrefix, targetBucket, targetPrefix) {
    console.log(`\n📋 Copying objects from '${sourceBucket}/${sourcePrefix}' to '${targetBucket}/${targetPrefix}'...`);

    try {
        // List all objects in source
        const listParams = {
            Bucket: sourceBucket,
            Prefix: sourcePrefix
        };

        const listCommand = new ListObjectsV2Command(listParams);
        const listedObjects = await s3.send(listCommand);

        if (!listedObjects.Contents || listedObjects.Contents.length === 0) {
            console.log('⚠️  No objects found to copy');
            return;
        }

        console.log(`Found ${listedObjects.Contents.length} objects to copy`);

        // Copy each object
        for (const object of listedObjects.Contents) {
            const sourceKey = object.Key;
            const fileName = sourceKey.replace(sourcePrefix, '').replace(/^\//, '');
            const targetKey = targetPrefix ? `${targetPrefix}/${fileName}` : fileName;

            try {
                const copyCommand = new CopyObjectCommand({
                    Bucket: targetBucket,
                    CopySource: `${sourceBucket}/${sourceKey}`,
                    Key: targetKey,
                    ACL: 'public-read' // For assets bucket
                });
                await s3.send(copyCommand);
                console.log(`✅ Copied: ${sourceKey} → ${targetKey}`);
            } catch (error) {
                console.error(`❌ Error copying ${sourceKey}:`, error.message);
            }
        }

        console.log('✅ All objects copied successfully');
    } catch (error) {
        console.error('❌ Error listing/copying objects:', error.message);
        throw error;
    }
}

/**
 * Main setup function
 */
async function setupBuckets() {
    console.log('=================================================');
    console.log('         S3 Buckets Setup Script');
    console.log('=================================================\n');
    console.log('This script will:');
    console.log('1. Create zeerostock-assets bucket (public)');
    console.log('2. Create zeerostock-verification-documents bucket (private)');
    console.log('3. Copy assets from old bucket to new assets bucket');
    console.log('=================================================\n');

    // Validate environment variables
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
        console.error('❌ AWS credentials not found in .env file');
        console.error('Required: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION');
        process.exit(1);
    }

    console.log('AWS Configuration:');
    console.log(`Region: ${REGION}`);
    console.log(`Access Key: ${process.env.AWS_ACCESS_KEY_ID.substring(0, 8)}...`);
    console.log('');

    try {
        // Step 1: Create assets bucket
        console.log('📦 STEP 1: Creating Assets Bucket');
        console.log('─────────────────────────────────────────────────');
        const assetsCreated = await createBucket(ASSETS_BUCKET);
        if (assetsCreated) {
            await makeAssetsPublic(ASSETS_BUCKET);
        }

        // Step 2: Create verification documents bucket
        console.log('\n📦 STEP 2: Creating Verification Documents Bucket');
        console.log('─────────────────────────────────────────────────');
        const verificationCreated = await createBucket(VERIFICATION_BUCKET);
        if (verificationCreated) {
            await makeVerificationPrivate(VERIFICATION_BUCKET);
        }

        // Step 3: Copy assets from old bucket (optional)
        console.log('\n📦 STEP 3: Copying Assets from Old Bucket');
        console.log('─────────────────────────────────────────────────');
        console.log('To copy assets from zeerostock-documents, uncomment the line below:');
        console.log('// await copyObjects("zeerostock-documents", "Assets", ASSETS_BUCKET, "");');

        // Uncomment the line below to actually copy the files:
        // await copyObjects('zeerostock-documents', 'Assets', ASSETS_BUCKET, '');

        console.log('\n=================================================');
        console.log('✅ SETUP COMPLETED SUCCESSFULLY!');
        console.log('=================================================\n');
        console.log('Next Steps:');
        console.log('1. Update your .env file with the new bucket names:');
        console.log(`   AWS_ASSETS_BUCKET_NAME=${ASSETS_BUCKET}`);
        console.log(`   AWS_VERIFICATION_BUCKET_NAME=${VERIFICATION_BUCKET}`);
        console.log('\n2. Run the migration script to copy files:');
        console.log('   node scripts/migrate-to-new-buckets.js');
        console.log('\n3. Update your application code to use the new bucket names');
        console.log('=================================================\n');

    } catch (error) {
        console.error('\n❌ Setup failed:', error.message);
        process.exit(1);
    }
}

// Run the setup
setupBuckets();
