const axios = require('axios');

async function testAuthFlow() {
    const client = axios.create({
        baseURL: 'http://localhost:3000',
        withCredentials: true,
        maxRedirects: 0,
        validateStatus: function (status) {
            return status >= 200 && status < 400; // Accept redirects
        }
    });

    try {
        console.log('🔍 Testing Authentication Flow...\n');

        // Step 1: Login
        console.log('1. Logging in as admin...');
        const loginResponse = await client.post('/login/admin', {
            email: 'admin@school.com',
            password: 'admin123'
        });
        console.log('   ✅ Login successful');
        console.log('   📍 Redirect to:', loginResponse.headers.location);

        // Step 2: Follow redirect
        console.log('\n2. Following redirect...');
        const redirectResponse = await client.get(loginResponse.headers.location);
        console.log('   ✅ Redirect followed');
        console.log('   📍 Final location:', redirectResponse.headers.location);

        // Step 3: Check if we're authenticated
        console.log('\n3. Checking authentication...');
        const cookies = client.defaults.headers.Cookie || '';
        console.log('   🍪 Cookies present:', cookies.length > 0);
        
        if (cookies.includes('token=')) {
            console.log('   ✅ JWT token found');
        } else {
            console.log('   ❌ JWT token missing');
        }

        if (cookies.includes('userInfo=')) {
            console.log('   ✅ User info found');
        } else {
            console.log('   ❌ User info missing');
        }

        console.log('\n🎉 Auth flow test completed!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Location:', error.response.headers.location);
        }
    }
}

testAuthFlow(); 