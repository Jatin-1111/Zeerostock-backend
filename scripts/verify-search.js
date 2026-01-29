const https = require('http');

const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/marketplace/products?q=steel',
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
};

const req = https.request(options, (res) => {
    console.log(`Search Status: ${res.statusCode}`);
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (json.success) {
                console.log('✅ Search Success');
                console.log('Results Found:', json.data.pagination.total);
            } else {
                console.error('❌ Search Error:', json);
            }
        } catch (e) { console.error('Parse Error', data); }
    });
});

req.end();
