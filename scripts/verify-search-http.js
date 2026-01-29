const http = require('http');

const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/marketplace/products?q=hlo',
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
};

console.log('Fetching:', options.path);
const req = http.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            console.log(`Status: ${res.statusCode}`);
            if (json.success) {
                console.log(`Total items returned: ${json.data.products.length}`);
                console.log(`Total count in metadata: ${json.data.pagination.total}`);

                if (json.data.products.length > 0) {
                    console.log('First Item:', json.data.products[0].title);
                    console.error('❌ FAIL: API returned products for "hlo" search');
                } else {
                    console.log('✅ PASS: API returned 0 products');
                }
            } else {
                console.error('❌ Error response:', json);
            }
        } catch (e) {
            console.error('Parse error:', data);
        }
    });
});

req.end();
