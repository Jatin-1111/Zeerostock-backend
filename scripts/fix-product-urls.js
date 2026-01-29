require('dotenv').config();
const { pool } = require('../src/config/database');

const S3_BUCKET = process.env.AWS_PRODUCTS_BUCKET_NAME;
const AWS_REGION = process.env.AWS_REGION;

// Helper to construct public URL
const getPublicUrl = (fileKey) => {
    return `https://${S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${fileKey}`;
};

// Helper to extract key from old URL
const extractKey = (url) => {
    if (!url) return null;
    try {
        // Handle Presigned URL: https://bucket.s3.region.amazonaws.com/KEY?signature...
        // Key is between .com/ and ?
        const urlObj = new URL(url);
        const pathname = urlObj.pathname; // /products/userId/filename
        let key = pathname.startsWith('/') ? pathname.substring(1) : pathname;

        // Fix path: we moved 'uploads/' to 'products/'
        if (key.startsWith('uploads/')) {
            key = key.replace('uploads/', 'products/');
        }
        return key;
    } catch (e) {
        console.error('Error parsing URL:', url, e.message);
        return null; // or keep original if invalid
    }
};

const fixProductUrls = async () => {
    try {
        console.log('Connecting to database...');
        const client = await pool.connect();

        console.log('Fetching products...');
        const { rows: products } = await client.query('SELECT id, image_url, gallery_images FROM products');
        console.log(`Found ${products.length} products.`);

        let updatedCount = 0;

        for (const product of products) {
            let needsUpdate = false;
            let newImageUrl = product.image_url;
            let newGallery = product.gallery_images;

            // 1. Fix main image_url
            if (product.image_url) {
                const key = extractKey(product.image_url);
                if (key) {
                    const candidateUrl = getPublicUrl(key);
                    // Compare decoded URLs to avoid mismatches due to encoding
                    if (decodeURIComponent(candidateUrl) !== decodeURIComponent(product.image_url)) {
                        newImageUrl = candidateUrl;
                        needsUpdate = true;
                    }
                }
            }

            // 2. Fix gallery_images (JSON array)
            if (Array.isArray(product.gallery_images) && product.gallery_images.length > 0) {
                const fixedGallery = product.gallery_images.map(img => {
                    // img can be string or object? check usage. Usually string urls.
                    // DB schema says JSONB/JSON. Code inserts `JSON.stringify(galleryImages)` where galleryImages is ... array of strings likely.
                    // Let's assume array of strings or objects with 'url'. 
                    // Looking at `uploadImages` controller, it returns array of objects { url, fileKey, ... }
                    // But `createListing` takes `galleryImages` from body. If FE sends array of strings, it's strings.
                    // Safe bet: handles both string and object.url

                    let originalUrl = img;
                    let isObject = false;
                    if (typeof img === 'object' && img !== null && img.url) {
                        originalUrl = img.url;
                        isObject = true;
                    }

                    if (typeof originalUrl === 'string' && (originalUrl.includes('?') || originalUrl.includes('zeerostock-assets'))) {
                        const key = extractKey(originalUrl);
                        if (key) {
                            const newUrl = getPublicUrl(key);
                            needsUpdate = true; // Mark as needed
                            return isObject ? { ...img, url: newUrl } : newUrl;
                        }
                    }
                    return img;
                });
                newGallery = fixedGallery;
            } else if (typeof product.gallery_images === 'string') {
                // Sometimes might be stored as stringified JSON if column type is text?
                // But schema in code suggested use of JSON.stringify implies column might be JSON-compatible or Text.
                // If it's a string that looks like JSON array:
                try {
                    const parsed = JSON.parse(product.gallery_images);
                    if (Array.isArray(parsed)) {
                        // repeat logic... simplified for script:
                        // We will assume column is JSON/JSONB and `rows` returns object.
                    }
                } catch (e) { }
            }


            if (needsUpdate) {
                // Update DB
                await client.query(
                    'UPDATE products SET image_url = $1, gallery_images = $2 WHERE id = $3',
                    [newImageUrl, JSON.stringify(newGallery), product.id]
                );
                console.log(`Updated product ${product.id}`);
                updatedCount++;
            }
        }

        console.log(`Fixed URLs for ${updatedCount} products.`);
        client.release();
        process.exit(0);

    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

fixProductUrls();
