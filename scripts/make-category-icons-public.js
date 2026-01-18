/**
 * Make Category Icons folder public in S3 bucket
 * This script creates a bucket policy to allow public read access to Category Icons
 */

require('dotenv').config();
const AWS = require('aws-sdk');

const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'us-east-1'
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;

// Bucket policy to make Category Icons folder public
const bucketPolicy = {
    Version: '2012-10-17',
    Statement: [
        {
            Sid: 'PublicReadCategoryIcons',
            Effect: 'Allow',
            Principal: '*',
            Action: 's3:GetObject',
            Resource: `arn:aws:s3:::${BUCKET_NAME}/Category Icons/*`
        }
    ]
};

async function getCurrentPolicy() {
    try {
        const result = await s3.getBucketPolicy({ Bucket: BUCKET_NAME }).promise();
        return JSON.parse(result.Policy);
    } catch (error) {
        if (error.code === 'NoSuchBucketPolicy') {
            return null;
        }
        throw error;
    }
}

async function makePublic() {
    console.log('🔧 Making Category Icons folder public...\n');
    console.log(`Bucket: ${BUCKET_NAME}`);
    console.log(`Region: ${process.env.AWS_REGION || 'us-east-1'}\n`);

    if (!BUCKET_NAME) {
        console.error('❌ Error: AWS_S3_BUCKET_NAME not found in .env');
        process.exit(1);
    }

    try {
        // Get current policy
        console.log('📋 Checking current bucket policy...');
        const currentPolicy = await getCurrentPolicy();

        let newPolicy;
        if (currentPolicy) {
            console.log('✓ Existing policy found, merging...');

            // Check if our statement already exists
            const hasStatement = currentPolicy.Statement.some(
                s => s.Sid === 'PublicReadCategoryIcons'
            );

            if (hasStatement) {
                console.log('✓ Category Icons are already public!');
                return;
            }

            // Merge with existing policy
            newPolicy = {
                ...currentPolicy,
                Statement: [...currentPolicy.Statement, ...bucketPolicy.Statement]
            };
        } else {
            console.log('✓ No existing policy, creating new one...');
            newPolicy = bucketPolicy;
        }

        // Apply the policy
        console.log('\n🚀 Applying bucket policy...');
        await s3.putBucketPolicy({
            Bucket: BUCKET_NAME,
            Policy: JSON.stringify(newPolicy, null, 2)
        }).promise();

        console.log('\n✅ Success! Category Icons folder is now publicly accessible!');
        console.log('\n📝 Applied Policy:');
        console.log(JSON.stringify(newPolicy, null, 2));

    } catch (error) {
        console.error('\n❌ Error:', error.message);

        if (error.code === 'AccessDenied') {
            console.error('\n💡 Your AWS credentials need PutBucketPolicy permission');
        }

        process.exit(1);
    }
}

makePublic();
