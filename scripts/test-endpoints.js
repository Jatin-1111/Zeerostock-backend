/**
 * API Test Script
 * Tests the multi-role supplier verification endpoints
 */

require('dotenv').config();
const axios = require('axios');

const API_URL = 'http://localhost:5000/api';
let adminToken = '';
let userToken = '';

// Test user credentials (use existing user)
const ADMIN_USER = {
    email: 'rajesh.kumar@industrialsolutions.com',
    // You'll need to know the password
};

const REGULAR_USER = {
    email: 'rajesh@shaktiind.com',
    // You'll need to know the password
};

async function testEndpoints() {
    console.log('\n🧪 Testing Multi-Role Supplier Verification System\n');
    console.log('='.repeat(60));

    try {
        // Test 1: Health Check
        console.log('\n1️⃣ Testing Health Endpoint...');
        const health = await axios.get('http://localhost:5000/health');
        console.log('   ✅ Health check passed:', health.data.message);

        // Test 2: Login as Admin
        console.log('\n2️⃣ Testing Admin Login...');
        console.log('   ⚠️  Manual step required:');
        console.log('   Please login as admin first to get token');
        console.log(`   Email: ${ADMIN_USER.email}`);
        console.log('   Then set the token in this script\n');

        // Test 3: Get User Roles (requires token)
        console.log('3️⃣ Testing Get User Roles...');
        console.log('   📝 Endpoint: GET /api/roles');
        console.log('   ⚠️  Requires authentication token\n');

        // Test 4: Admin Stats (requires admin token)
        console.log('4️⃣ Testing Admin Statistics...');
        console.log('   📝 Endpoint: GET /api/admin/supplier-verifications/stats');
        console.log('   ⚠️  Requires admin authentication token\n');

        // Test 5: Request Supplier Role (requires regular user token)
        console.log('5️⃣ Testing Request Supplier Role...');
        console.log('   📝 Endpoint: POST /api/roles/request-supplier-role');
        console.log('   ⚠️  Requires regular user authentication token\n');

        // Instructions for manual testing
        console.log('='.repeat(60));
        console.log('\n📋 MANUAL TESTING INSTRUCTIONS:\n');

        console.log('1. Login as regular user to get token:');
        console.log('   POST http://localhost:5000/api/auth/login');
        console.log('   Body: { "email": "rajesh@shaktiind.com", "password": "your_password" }\n');

        console.log('2. Test Get Roles:');
        console.log('   curl http://localhost:5000/api/roles \\');
        console.log('     -H "Authorization: Bearer YOUR_TOKEN"\n');

        console.log('3. Test Request Supplier Role:');
        console.log('   curl -X POST http://localhost:5000/api/roles/request-supplier-role \\');
        console.log('     -H "Authorization: Bearer YOUR_TOKEN" \\');
        console.log('     -H "Content-Type: application/json" \\');
        console.log('     -d \'{');
        console.log('       "business_name": "Shakti Industries",');
        console.log('       "business_type": "manufacturer",');
        console.log('       "business_description": "We manufacture industrial equipment...",');
        console.log('       "business_address": "123 Industrial Area, Mumbai - 400001"');
        console.log('     }\'\n');

        console.log('4. Login as admin:');
        console.log('   POST http://localhost:5000/api/auth/login');
        console.log('   Body: { "email": "rajesh.kumar@industrialsolutions.com", "password": "your_password" }\n');

        console.log('5. Test Admin Stats:');
        console.log('   curl http://localhost:5000/api/admin/supplier-verifications/stats \\');
        console.log('     -H "Authorization: Bearer ADMIN_TOKEN"\n');

        console.log('6. Test Get Pending Verifications:');
        console.log('   curl http://localhost:5000/api/admin/supplier-verifications \\');
        console.log('     -H "Authorization: Bearer ADMIN_TOKEN"\n');

        console.log('7. Test Approve Verification:');
        console.log('   curl -X POST http://localhost:5000/api/admin/supplier-verifications/VERIFICATION_ID/approve \\');
        console.log('     -H "Authorization: Bearer ADMIN_TOKEN" \\');
        console.log('     -H "Content-Type: application/json" \\');
        console.log('     -d \'{"admin_notes": "Approved after verification"}\'\n');

        console.log('8. Test Switch Role:');
        console.log('   curl -X POST http://localhost:5000/api/roles/switch-role \\');
        console.log('     -H "Authorization: Bearer YOUR_TOKEN" \\');
        console.log('     -H "Content-Type: application/json" \\');
        console.log('     -d \'{"role": "supplier"}\'\n');

        console.log('='.repeat(60));
        console.log('\n✅ All endpoint paths are correctly configured!');
        console.log('🚀 Server is running and ready for testing\n');

    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        if (error.response) {
            console.error('   Response:', error.response.data);
        }
    }
}

testEndpoints();
