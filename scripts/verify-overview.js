const https = require('http'); // HTTP for localhost

const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/marketplace/overview',
    method: 'GET',
    headers: {
        'Content-Type': 'application/json'
    }
};

const req = https.request(options, (res) => {
    console.log(`StatusCode: ${res.statusCode}`);
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (json.success) {
                console.log('✅ Overview API Success');
                console.log('Product Count:', json.data.products.length);
                console.log('Filters Available:', Object.keys(json.data.filters));
                console.log('Stats:', json.data.stats);
            } else {
                console.error('❌ API Error:', json);
            }
        } catch (e) {
            console.error('❌ Failed to parse response:', data);
        }
    });
});

req.on('error', (error) => {
    console.error('❌ Request Error:', error);
});

req.end();
