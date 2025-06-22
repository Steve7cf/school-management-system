const axios = require('axios');
const https = require('https');

// Test configuration
const BASE_URL = process.env.TEST_URL || 'http://localhost:4000';
const TEST_EMAIL = process.env.TEST_EMAIL || 'admin@school.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'admin123';

// Create axios instance with cookie handling
const client = axios.create({
    baseURL: BASE_URL,
    withCredentials: true, // Important for cookie handling
    httpsAgent: new https.Agent({
        rejectUnauthorized: false // For self-signed certificates in testing
    })
});

async function testAuthentication() {
    console.log('🧪 Testing JWT and Cookie Authentication...\n');
    
    try {
        // Step 1: Test login
        console.log('1️⃣ Attempting login...');
        const loginResponse = await client.post('/login/admin', {
            email: TEST_EMAIL,
            password: TEST_PASSWORD
        }, {
            maxRedirects: 0,
            validateStatus: function (status) {
                return status >= 200 && status < 400; // Accept redirects
            }
        });
        
        console.log(`✅ Login response status: ${loginResponse.status}`);
        console.log(`📍 Redirect location: ${loginResponse.headers.location || 'None'}`);
        
        // Check for cookies
        const cookies = loginResponse.headers['set-cookie'];
        if (cookies) {
            console.log('🍪 Cookies set:');
            cookies.forEach(cookie => {
                console.log(`   - ${cookie.split(';')[0]}`);
            });
        } else {
            console.log('⚠️  No cookies found in response');
        }
        
        // Step 2: Follow redirect to dashboard
        if (loginResponse.headers.location) {
            console.log('\n2️⃣ Following redirect to dashboard...');
            const dashboardResponse = await client.get(loginResponse.headers.location);
            console.log(`✅ Dashboard response status: ${dashboardResponse.status}`);
            
            // Check if we're authenticated
            if (dashboardResponse.data.includes('dashboard') || dashboardResponse.data.includes('admin')) {
                console.log('✅ Successfully authenticated and accessed dashboard');
            } else {
                console.log('⚠️  Dashboard access may have failed');
            }
        }
        
        // Step 3: Test logout
        console.log('\n3️⃣ Testing logout...');
        const logoutResponse = await client.get('/logout', {
            maxRedirects: 0,
            validateStatus: function (status) {
                return status >= 200 && status < 400;
            }
        });
        
        console.log(`✅ Logout response status: ${logoutResponse.status}`);
        console.log(`📍 Logout redirect: ${logoutResponse.headers.location || 'None'}`);
        
        // Check for cookie clearing
        const logoutCookies = logoutResponse.headers['set-cookie'];
        if (logoutCookies) {
            console.log('🍪 Cookies cleared:');
            logoutCookies.forEach(cookie => {
                if (cookie.includes('Max-Age=0') || cookie.includes('Expires=')) {
                    console.log(`   - ${cookie.split(';')[0]} (cleared)`);
                }
            });
        }
        
        console.log('\n🎉 Authentication test completed successfully!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        
        if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error(`Headers:`, error.response.headers);
            console.error(`Data:`, error.response.data);
        }
    }
}

// Test JWT token generation
async function testJWTGeneration() {
    console.log('\n🔐 Testing JWT Token Generation...\n');
    
    try {
        const JWTService = require('../services/jwtService');
        
        const testUser = {
            _id: 'test123',
            email: 'test@example.com',
            role: 'admin'
        };
        
        const token = JWTService.generateToken(testUser);
        console.log(`✅ JWT Token generated: ${token.substring(0, 50)}...`);
        
        const decoded = JWTService.verifyToken(token);
        console.log(`✅ JWT Token verified:`, decoded);
        
        console.log('🎉 JWT test completed successfully!');
        
    } catch (error) {
        console.error('❌ JWT test failed:', error.message);
    }
}

// Run tests
async function runTests() {
    console.log('🚀 Starting JWT and Cookie Authentication Tests\n');
    console.log(`🌐 Base URL: ${BASE_URL}`);
    console.log(`👤 Test Email: ${TEST_EMAIL}`);
    console.log(`🔑 Test Password: ${TEST_PASSWORD}\n`);
    
    await testJWTGeneration();
    await testAuthentication();
}

// Run if this script is executed directly
if (require.main === module) {
    runTests().catch(console.error);
}

module.exports = { testAuthentication, testJWTGeneration }; 