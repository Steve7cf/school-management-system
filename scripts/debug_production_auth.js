const axios = require('axios');

async function debugProductionAuth() {
    const client = axios.create({
        baseURL: 'http://localhost:3000',
        withCredentials: true,
        maxRedirects: 0,
        validateStatus: function (status) {
            return status >= 200 && status < 400; // Accept redirects
        }
    });

    try {
        console.log('🔍 Debugging Production Authentication...\n');

        // Step 1: Test admin login
        console.log('1. Testing admin login...');
        const loginResponse = await client.post('/login/admin', {
            email: 'admin@school.com',
            password: 'admin123'
        });
        console.log('   📊 Login Status:', loginResponse.status);
        console.log('   📍 Login Redirect:', loginResponse.headers.location);

        // Step 2: Check cookies after login
        console.log('\n2. Checking cookies after login...');
        const cookies = client.defaults.headers.Cookie || '';
        console.log('   🍪 All cookies:', cookies);
        
        if (cookies.includes('token=')) {
            const tokenMatch = cookies.match(/token=([^;]+)/);
            if (tokenMatch) {
                const token = tokenMatch[1];
                console.log('   ✅ JWT Token found');
                console.log('   📏 Token length:', token.length);
                
                // Try to decode token
                try {
                    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
                    console.log('   🔍 Token payload:', {
                        id: payload.id,
                        role: payload.role,
                        email: payload.email,
                        exp: new Date(payload.exp * 1000).toISOString()
                    });
                } catch (e) {
                    console.log('   ❌ Could not decode token payload');
                }
            }
        } else {
            console.log('   ❌ JWT Token not found');
        }

        if (cookies.includes('userInfo=')) {
            const userInfoMatch = cookies.match(/userInfo=([^;]+)/);
            if (userInfoMatch) {
                try {
                    const userInfo = JSON.parse(decodeURIComponent(userInfoMatch[1]));
                    console.log('   ✅ User Info found:', userInfo);
                } catch (e) {
                    console.log('   ❌ Could not parse userInfo');
                }
            }
        } else {
            console.log('   ❌ User Info not found');
        }

        // Step 3: Test dashboard access
        console.log('\n3. Testing dashboard access...');
        try {
            const dashboardResponse = await client.get('/dashboard');
            console.log('   📊 Dashboard Status:', dashboardResponse.status);
            console.log('   📍 Dashboard Redirect:', dashboardResponse.headers.location);
        } catch (error) {
            console.log('   ❌ Dashboard access failed');
            console.log('   📊 Error Status:', error.response?.status);
            console.log('   📍 Error Redirect:', error.response?.headers?.location);
        }

        // Step 4: Test direct admin dashboard access
        console.log('\n4. Testing direct admin dashboard access...');
        try {
            const adminDashboardResponse = await client.get('/dashboard/admin');
            console.log('   📊 Admin Dashboard Status:', adminDashboardResponse.status);
            console.log('   📍 Admin Dashboard Redirect:', adminDashboardResponse.headers.location);
        } catch (error) {
            console.log('   ❌ Admin dashboard access failed');
            console.log('   📊 Error Status:', error.response?.status);
            console.log('   📍 Error Redirect:', error.response?.headers?.location);
        }

        // Step 5: Test authentication middleware
        console.log('\n5. Testing authentication middleware...');
        try {
            const authTestResponse = await client.get('/students');
            console.log('   📊 Auth Test Status:', authTestResponse.status);
            console.log('   📍 Auth Test Redirect:', authTestResponse.headers.location);
        } catch (error) {
            console.log('   ❌ Auth test failed');
            console.log('   📊 Error Status:', error.response?.status);
            console.log('   📍 Error Redirect:', error.response?.headers?.location);
        }

        console.log('\n🎉 Production auth debug completed!');

    } catch (error) {
        console.error('❌ Debug failed:', error.message);
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Location:', error.response.headers.location);
        }
    }
}

// Run the debug
debugProductionAuth(); 