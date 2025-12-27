/**
 * Test script to verify AWS S3 connection and configuration
 * Run: node src/utils/test-s3.js
 */

require('dotenv').config();
const s3Service = require('../services/s3.service');

async function testS3Connection() {
    console.log('🧪 Testing AWS S3 Configuration...\n');

    // Check if S3 is configured
    console.log('📋 Configuration Status:');
    console.log(`   - AWS Region: ${process.env.AWS_REGION || '❌ NOT SET'}`);
    console.log(`   - S3 Bucket: ${process.env.AWS_S3_BUCKET_NAME || '❌ NOT SET'}`);
    console.log(`   - Access Key ID: ${process.env.AWS_ACCESS_KEY_ID ? '✅ SET' : '❌ NOT SET'}`);
    console.log(`   - Secret Access Key: ${process.env.AWS_SECRET_ACCESS_KEY ? '✅ SET' : '❌ NOT SET'}`);
    console.log(`   - Is Configured: ${s3Service.isConfigured() ? '✅ YES' : '❌ NO'}\n`);

    if (!s3Service.isConfigured()) {
        console.error('❌ S3 is not properly configured. Please check your .env file.\n');
        process.exit(1);
    }

    try {
        // Create a test file buffer
        const testContent = 'This is a test file for S3 connection';
        const testBuffer = Buffer.from(testContent);
        const testFileName = 'test-connection.txt';

        console.log('📤 Uploading test file...');
        const uploadResult = await s3Service.uploadFile(
            testBuffer,
            testFileName,
            'text/plain',
            'test-uploads'
        );

        console.log('✅ Upload successful!');
        console.log(`   - File Key: ${uploadResult.fileKey}`);
        console.log(`   - URL: ${uploadResult.url}\n`);

        console.log('🔗 Generating presigned URL (expires in 1 hour)...');
        const presignedResult = await s3Service.getPresignedUrl(uploadResult.fileKey, 3600);
        console.log('✅ Presigned URL generated!');
        console.log(`   - URL: ${presignedResult.url.substring(0, 100)}...\n`);

        console.log('🗑️  Deleting test file...');
        await s3Service.deleteFile(uploadResult.fileKey);
        console.log('✅ Test file deleted successfully!\n');

        console.log('🎉 All S3 operations completed successfully!\n');
        console.log('✅ AWS S3 is properly configured and working.\n');

    } catch (error) {
        console.error('\n❌ S3 Test Failed!');
        console.error(`   Error: ${error.message}\n`);
        console.error('   Please check:');
        console.error('   1. Your AWS credentials are correct');
        console.error('   2. The IAM user has S3 permissions');
        console.error('   3. The S3 bucket exists and is accessible');
        console.error('   4. The region is correct\n');
        process.exit(1);
    }
}

// Run the test
testS3Connection();
