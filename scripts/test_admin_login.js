const axios = require('axios');

async function testAdminLogin() {
    const client = axios.create({
        baseURL: 'http://localhost:3000',
        withCredentials: true,
        maxRedirects: 0,
        validateStatus: function (status) {
            return status >= 200 && status < 400; // Accept redirects
        }
    });

    try {
        console.log('🔍 Testing Admin Login Flow...\n');

        // Step 1: Get login page
        console.log('1. Getting admin login page...');
        const loginPageResponse = await client.get('/admin/login');
        console.log('   ✅ Login page loaded successfully');

        // Step 2: Attempt admin login
        console.log('\n2. Attempting admin login...');
        const loginResponse = await client.post('/login/admin', {
            email: 'admin@school.com',
            password: 'admin123'
        });
        console.log('   ✅ Login response received');
        console.log('   📊 Status:', loginResponse.status);
        console.log('   📍 Location:', loginResponse.headers.location);

        // Step 3: Follow redirect to dashboard
        if (loginResponse.headers.location) {
            console.log('\n3. Following redirect to dashboard...');
            const dashboardResponse = await client.get(loginResponse.headers.location);
            console.log('   ✅ Dashboard response received');
            console.log('   📊 Status:', dashboardResponse.status);
            
            if (dashboardResponse.headers.location) {
                console.log('   📍 Final Location:', dashboardResponse.headers.location);
            }
        }

        // Step 4: Check cookies
        console.log('\n4. Checking authentication cookies...');
        const cookies = client.defaults.headers.Cookie || '';
        if (cookies.includes('token=')) {
            console.log('   ✅ JWT token cookie found');
        } else {
            console.log('   ❌ JWT token cookie missing');
        }
        
        if (cookies.includes('userInfo=')) {
            console.log('   ✅ User info cookie found');
        } else {
            console.log('   ❌ User info cookie missing');
        }

        // Step 5: Test direct access to admin dashboard
        console.log('\n5. Testing direct access to admin dashboard...');
        try {
            const adminDashboardResponse = await client.get('/dashboard/admin');
            console.log('   ✅ Admin dashboard accessible');
            console.log('   📊 Status:', adminDashboardResponse.status);
        } catch (error) {
            console.log('   ❌ Admin dashboard access failed');
            console.log('   📊 Status:', error.response?.status);
            console.log('   📍 Redirect:', error.response?.headers?.location);
        }

        console.log('\n🎉 Admin login test completed!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Location:', error.response.headers.location);
        }
    }
}

// Run the test
testAdminLogin(); 