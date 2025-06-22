const axios = require('axios');

async function testFormDelete() {
    const client = axios.create({
        baseURL: 'http://localhost:3000',
        withCredentials: true,
        maxRedirects: 0,
        validateStatus: function (status) {
            return status >= 200 && status < 400; // Accept redirects
        }
    });

    try {
        console.log('🔍 Testing Form-Based Delete...\n');

        // Step 1: Login as admin
        console.log('1. Logging in as admin...');
        const loginResponse = await client.post('/login/admin', {
            email: 'admin@school.com',
            password: 'admin123'
        });
        console.log('   📊 Login Status:', loginResponse.status);
        console.log('   📍 Login Redirect:', loginResponse.headers.location);

        // Step 2: Test POST delete route
        console.log('\n2. Testing POST delete route...');
        try {
            const postDeleteResponse = await client.post('/announcements/test-id-123/delete');
            console.log('   📊 POST Delete Status:', postDeleteResponse.status);
            console.log('   📍 POST Delete Redirect:', postDeleteResponse.headers.location);
            
            if (postDeleteResponse.status === 302) {
                console.log('   ✅ POST delete route working');
                console.log('   📍 Redirecting to:', postDeleteResponse.headers.location);
            } else {
                console.log('   ⚠️  Unexpected response from POST delete route');
            }
        } catch (error) {
            console.log('   ❌ Error with POST delete route');
            console.log('   📊 Error Status:', error.response?.status);
            console.log('   📍 Error Redirect:', error.response?.headers?.location);
        }

        console.log('\n🎉 Form delete test completed!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Data:', error.response.data);
        }
    }
}

testFormDelete(); 