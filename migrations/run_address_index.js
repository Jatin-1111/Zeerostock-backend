const https = require('https');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PROJECT_REF = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)[1];

const SQL_QUERY = `
CREATE INDEX IF NOT EXISTS idx_user_addresses_user_lookup 
ON user_addresses(user_id, is_default DESC, created_at DESC);
`;

async function runMigration() {
    const postData = JSON.stringify({
        query: SQL_QUERY
    });

    const options = {
        hostname: `${PROJECT_REF}.supabase.co`,
        port: 443,
        path: '/rest/v1/rpc/exec_sql',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                if (res.statusCode === 200 || res.statusCode === 201) {
                    console.log('✅ Index created successfully!');
                    console.log('Response:', data);
                    resolve(data);
                } else {
                    console.log(`Status: ${res.statusCode}`);
                    console.log('Response:', data);
                    console.log('\n⚠️  Direct execution not available.');
                    console.log('\nPlease run this SQL in Supabase Dashboard:');
                    console.log('1. Go to: https://supabase.com/dashboard/project/' + PROJECT_REF + '/sql/new');
                    console.log('2. Paste and run:\n');
                    console.log(SQL_QUERY);
                    resolve(data);
                }
            });
        });

        req.on('error', (error) => {
            console.error('Error:', error.message);
            console.log('\nPlease run this SQL manually in Supabase Dashboard:');
            console.log('1. Go to: https://supabase.com/dashboard/project/' + PROJECT_REF + '/sql/new');
            console.log('2. Paste and run:\n');
            console.log(SQL_QUERY);
            reject(error);
        });

        req.write(postData);
        req.end();
    });
}

console.log('Running migration for user_addresses index...\n');
runMigration().catch(console.error);
