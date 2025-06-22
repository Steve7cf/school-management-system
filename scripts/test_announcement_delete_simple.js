const axios = require('axios');

async function testAnnouncementDelete() {
    const client = axios.create({
        baseURL: 'http://localhost:3000',
        withCredentials: true,
        maxRedirects: 0,
        validateStatus: function (status) {
            return status >= 200 && status < 400; // Accept redirects
        }
    });

    try {
        console.log('🔍 Testing Announcement Delete...\n');

        // Step 1: Login as admin
        console.log('1. Logging in as admin...');
        const loginResponse = await client.post('/login/admin', {
            email: 'admin@school.com',
            password: 'admin123'
        });
        console.log('   ✅ Login successful');

        // Step 2: Test delete with invalid ID
        console.log('\n2. Testing delete with invalid ID...');
        try {
            const deleteResponse = await client.delete('/announcements/invalid-id-123');
            console.log('   📊 Status:', deleteResponse.status);
            console.log('   📄 Response:', deleteResponse.data);
            
            if (deleteResponse.status === 404) {
                console.log('   ✅ Properly handles invalid ID');
            } else {
                console.log('   ⚠️  Unexpected response for invalid ID');
            }
        } catch (error) {
            console.log('   📊 Error Status:', error.response?.status);
            console.log('   📄 Error Data:', error.response?.data);
            
            if (error.response?.status === 404) {
                console.log('   ✅ Properly handles invalid ID');
            } else if (error.response?.status === 401) {
                console.log('   ❌ Authentication issue');
            } else if (error.response?.status === 403) {
                console.log('   ❌ Permission issue');
            }
        }

        console.log('\n🎉 Announcement delete test completed!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Data:', error.response.data);
        }
    }
}

testAnnouncementDelete(); 