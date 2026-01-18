# S3 Bucket Migration Guide

## Overview

This guide will help you migrate from a single S3 bucket (`zeerostock-documents`) to a two-bucket structure:

- **zeerostock-assets** (Public) - For images, logos, icons, and other static assets
- **zeerostock-verification-documents** (Private) - For supplier verification documents

## Why This Change?

1. **Security**: Verification documents should be private and only accessible via presigned URLs
2. **Performance**: Public assets can be served directly without presigned URLs (faster loading)
3. **Cost**: No need to generate presigned URLs for public assets
4. **Organization**: Clear separation between public and private content

## Migration Steps

### Step 1: Install AWS SDK (if not already installed)

```bash
cd Zeerostock-backend
npm install aws-sdk
```

### Step 2: Setup New Buckets

```bash
node scripts/setup-s3-buckets.js
```

This will:

- Create `zeerostock-assets` bucket with public access
- Create `zeerostock-verification-documents` bucket (private)
- Configure CORS, encryption, and access policies

### Step 3: Migrate Files

```bash
node scripts/migrate-to-new-buckets.js
```

This will:

- Copy all files from `zeerostock-documents/Assets/` to `zeerostock-assets/`
- Copy all files from `zeerostock-documents/verification-documents/` to `zeerostock-verification-documents/`
- Generate `new-asset-urls.json` with public URLs for all assets

### Step 4: Update Environment Variables

Add to your `.env` file:

```env
# Old (keep for backward compatibility during transition)
AWS_S3_BUCKET_NAME=zeerostock-documents

# New - Assets bucket (public)
AWS_ASSETS_BUCKET_NAME=zeerostock-assets

# New - Verification documents bucket (private)
AWS_VERIFICATION_BUCKET_NAME=zeerostock-verification-documents

# AWS credentials (same as before)
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=ap-south-1
```

### Step 5: Update Backend Code

#### Update `src/services/s3.service.js`:

```javascript
class S3Service {
  constructor() {
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
    // Use appropriate bucket based on file type
    this.assetsBucket = process.env.AWS_ASSETS_BUCKET_NAME;
    this.verificationBucket = process.env.AWS_VERIFICATION_BUCKET_NAME;
  }

  // Add method to determine which bucket to use
  getBucketName(folder) {
    if (folder.startsWith("verification-documents")) {
      return this.verificationBucket;
    }
    return this.assetsBucket;
  }

  async uploadFile(fileBuffer, originalName, mimeType, folder = "documents") {
    const bucketName = this.getBucketName(folder);
    // ... rest of your upload logic
  }
}
```

#### Update `src/controllers/supplierVerification.controller.js`:

Change the folder path to use the verification bucket:

```javascript
const folder = `verification-documents/${userId}/${documentType}`;
// The s3Service will automatically use AWS_VERIFICATION_BUCKET_NAME
```

### Step 6: Update Frontend Code

#### Update `next.config.ts`:

```typescript
images: {
  remotePatterns: [
    {
      protocol: 'https',
      hostname: 'zeerostock-assets.s3.ap-south-1.amazonaws.com',
    },
    {
      protocol: 'https',
      hostname: 'zeerostock-verification-documents.s3.ap-south-1.amazonaws.com',
    },
  ],
},
```

#### Replace S3 URLs in Components:

Use the URLs from `scripts/new-asset-urls.json` to replace old presigned URLs with new public URLs.

Example:

```typescript
// Old (presigned URL)
src =
  "https://zeerostock-documents.s3.ap-south-1.amazonaws.com/Assets/logo.svg?X-Amz-Algorithm=...";

// New (public URL - no signature needed)
src = "https://zeerostock-assets.s3.ap-south-1.amazonaws.com/logo.svg";
```

### Step 7: Update Asset Upload Script

Update `scripts/upload-assets-to-s3.js`:

```javascript
const BUCKET_NAME = process.env.AWS_ASSETS_BUCKET_NAME; // Changed from AWS_S3_BUCKET_NAME
const S3_FOLDER = ""; // No folder prefix needed, files go to root

// Remove presigned URL generation for public assets
// Assets are now accessible directly via public URL
```

### Step 8: Test Everything

1. **Test asset loading**: Verify all images load correctly on the frontend
2. **Test document upload**: Upload a verification document and ensure it works
3. **Test presigned URLs**: Verification documents should still use presigned URLs
4. **Test new uploads**: Upload new assets and verify they go to the correct bucket

### Step 9: Cleanup (Optional)

After verifying everything works:

```bash
# Delete old files from zeerostock-documents bucket
aws s3 rm s3://zeerostock-documents/Assets/ --recursive
aws s3 rm s3://zeerostock-documents/verification-documents/ --recursive
```

## Bucket Configuration Summary

### zeerostock-assets (Public)

- **Access**: Public read
- **Use for**: Logos, images, icons, static assets
- **URL format**: `https://zeerostock-assets.s3.ap-south-1.amazonaws.com/filename.ext`
- **No presigned URLs needed**: Direct public access

### zeerostock-verification-documents (Private)

- **Access**: Private (presigned URLs only)
- **Use for**: Supplier verification documents (ID proofs, business licenses, etc.)
- **URL format**: Generated presigned URLs with expiration
- **Security**: Server-side encryption enabled

## Troubleshooting

### Assets not loading

- Check bucket policy is set to public read
- Verify CORS configuration
- Check Next.js remotePatterns includes new bucket domain

### Verification uploads failing

- Verify AWS credentials in .env
- Check bucket name environment variables
- Ensure IAM user has PutObject permissions

### Mixed content errors

- Ensure all URLs use HTTPS
- Check browser console for specific errors

## Benefits of New Structure

✅ **Security**: Verification documents are private  
✅ **Performance**: Public assets load faster (no presigned URL generation)  
✅ **Cost**: Reduced Lambda/API calls for asset access  
✅ **Organization**: Clear separation of public vs private content  
✅ **Scalability**: Easier to manage permissions and access controls

## Rollback Plan

If you need to rollback:

1. Keep the old `AWS_S3_BUCKET_NAME` environment variable
2. The old bucket files are not deleted automatically
3. Revert code changes to use single bucket
4. Delete new buckets if needed
