const https = require('http');

// Slug from user screenshot
const slug = '90mm-elbow-90-deg-grey-din-8063-843r44-1768988049774';

const options = {
    hostname: 'localhost',
    port: 5000,
    path: `/api/products/${slug}`,
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
};

console.log('Fetching:', options.path);
const start = Date.now();

const req = https.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        const duration = Date.now() - start;
        console.log(`Status: ${res.statusCode}`);
        console.log(`Duration: ${duration}ms`);

        try {
            const json = JSON.parse(data);
            if (json.success) {
                console.log('✅ Success: Product found');
                console.log('Reviews:', json.data.reviewStats?.totalReviews);
                console.log('Specs:', Object.keys(json.data.specifications || {}).length);
            } else {
                console.error('❌ Error:', json.message);
            }
        } catch (e) { console.error('Parse Error'); }
    });
});

req.end();
