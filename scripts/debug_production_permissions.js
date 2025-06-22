const axios = require('axios');
const https = require('https');

// Test configuration
const BASE_URL = process.env.TEST_URL || 'http://localhost:4000';
const TEST_EMAIL = process.env.TEST_EMAIL || 'admin@school.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'admin123';

// Create axios instance with cookie handling
const client = axios.create({
    baseURL: BASE_URL,
    withCredentials: true,
    httpsAgent: new https.Agent({
        rejectUnauthorized: false
    })
});

async function testAuthenticationAndPermissions() {
    console.log('🔍 Testing Authentication and Permissions...\n');
    
    try {
        // Step 1: Login
        console.log('1️⃣ Logging in...');
        const loginResponse = await client.post('/login/admin', {
            email: TEST_EMAIL,
            password: TEST_PASSWORD
        }, {
            maxRedirects: 0,
            validateStatus: function (status) {
                return status >= 200 && status < 400;
            }
        });
        
        console.log(`✅ Login status: ${loginResponse.status}`);
        
        // Check cookies
        const cookies = loginResponse.headers['set-cookie'];
        if (cookies) {
            console.log('🍪 Cookies received:');
            cookies.forEach(cookie => {
                console.log(`   - ${cookie.split(';')[0]}`);
            });
        }
        
        // Step 2: Access dashboard
        if (loginResponse.headers.location) {
            console.log('\n2️⃣ Accessing dashboard...');
            const dashboardResponse = await client.get(loginResponse.headers.location);
            console.log(`✅ Dashboard status: ${dashboardResponse.status}`);
            
            // Check if user info is present in the response
            if (dashboardResponse.data.includes('user') || dashboardResponse.data.includes('admin')) {
                console.log('✅ User data found in dashboard');
            }
        }
        
        // Step 3: Test protected routes
        console.log('\n3️⃣ Testing protected routes...');
        
        const routesToTest = [
            { path: '/students', name: 'Students List', expectedRole: 'admin' },
            { path: '/teachers', name: 'Teachers List', expectedRole: 'admin' },
            { path: '/classes', name: 'Classes List', expectedRole: 'admin' },
            { path: '/subjects', name: 'Subjects List', expectedRole: 'admin' },
            { path: '/attendance', name: 'Attendance', expectedRole: 'admin' },
            { path: '/exams', name: 'Exams', expectedRole: 'admin' },
            { path: '/results', name: 'Results', expectedRole: 'admin' },
            { path: '/announcements', name: 'Announcements', expectedRole: 'admin' },
            { path: '/profile', name: 'Profile', expectedRole: 'admin' }
        ];
        
        for (const route of routesToTest) {
            try {
                console.log(`   Testing ${route.name} (${route.path})...`);
                const response = await client.get(route.path, {
                    maxRedirects: 0,
                    validateStatus: function (status) {
                        return status >= 200 && status < 500; // Accept all responses to see what happens
                    }
                });
                
                if (response.status === 200) {
                    console.log(`   ✅ ${route.name}: Access granted (${response.status})`);
                } else if (response.status === 302 || response.status === 301) {
                    console.log(`   ⚠️  ${route.name}: Redirected (${response.status}) -> ${response.headers.location}`);
                } else if (response.status === 403) {
                    console.log(`   ❌ ${route.name}: Permission denied (${response.status})`);
                } else if (response.status === 401) {
                    console.log(`   🔒 ${route.name}: Unauthorized (${response.status})`);
                } else {
                    console.log(`   ❓ ${route.name}: Unexpected status (${response.status})`);
                }
                
            } catch (error) {
                console.log(`   💥 ${route.name}: Error - ${error.message}`);
            }
        }
        
        // Step 4: Test user info endpoint
        console.log('\n4️⃣ Testing user info...');
        try {
            const userInfoResponse = await client.get('/api/user-info', {
                maxRedirects: 0,
                validateStatus: function (status) {
                    return status >= 200 && status < 500;
                }
            });
            
            if (userInfoResponse.status === 200) {
                console.log('✅ User info endpoint accessible');
                console.log('   User data:', userInfoResponse.data);
            } else {
                console.log(`⚠️  User info endpoint: ${userInfoResponse.status}`);
            }
        } catch (error) {
            console.log('❌ User info endpoint error:', error.message);
        }
        
        // Step 5: Check cookies in browser simulation
        console.log('\n5️⃣ Checking current cookies...');
        const currentCookies = client.defaults.headers.Cookie;
        if (currentCookies) {
            console.log('🍪 Current cookies:', currentCookies);
        } else {
            console.log('⚠️  No cookies in current session');
        }
        
        console.log('\n🎉 Permission test completed!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        
        if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error(`Headers:`, error.response.headers);
            if (error.response.data) {
                console.error(`Data:`, error.response.data.substring(0, 500));
            }
        }
    }
}

// Test JWT token parsing
async function testJWTTokenParsing() {
    console.log('\n🔐 Testing JWT Token Parsing...\n');
    
    try {
        const JWTService = require('../services/jwtService');
        
        // Test with sample token data
        const testUser = {
            _id: 'test123',
            email: 'test@example.com',
            role: 'admin',
            firstName: 'Test',
            lastName: 'User'
        };
        
        const token = JWTService.generateToken(testUser);
        console.log(`✅ JWT Token generated: ${token.substring(0, 50)}...`);
        
        const decoded = JWTService.verifyToken(token);
        console.log(`✅ JWT Token decoded:`, decoded);
        
        // Test userInfo cookie parsing
        const userInfo = {
            id: decoded.id,
            firstName: 'Test',
            lastName: 'User',
            role: decoded.role,
            email: decoded.email
        };
        
        const userInfoString = JSON.stringify(userInfo);
        console.log(`✅ UserInfo JSON: ${userInfoString}`);
        
        const parsedUserInfo = JSON.parse(userInfoString);
        console.log(`✅ UserInfo parsed:`, parsedUserInfo);
        
        console.log('🎉 JWT parsing test completed!');
        
    } catch (error) {
        console.error('❌ JWT parsing test failed:', error.message);
    }
}

// Run tests
async function runTests() {
    console.log('🚀 Starting Production Permission Debug Tests\n');
    console.log(`🌐 Base URL: ${BASE_URL}`);
    console.log(`👤 Test Email: ${TEST_EMAIL}`);
    console.log(`🔑 Test Password: ${TEST_PASSWORD}\n`);
    
    await testJWTTokenParsing();
    await testAuthenticationAndPermissions();
}

// Run if this script is executed directly
if (require.main === module) {
    runTests().catch(console.error);
}

module.exports = { testAuthenticationAndPermissions, testJWTTokenParsing }; 