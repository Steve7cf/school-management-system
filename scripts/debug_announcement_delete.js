const axios = require('axios');

async function debugAnnouncementDelete() {
    const client = axios.create({
        baseURL: 'http://localhost:3000',
        withCredentials: true,
        maxRedirects: 0,
        validateStatus: function (status) {
            return status >= 200 && status < 400; // Accept redirects
        }
    });

    try {
        console.log('🔍 Debugging Announcement Delete Issue...\n');

        // Step 1: Login as admin
        console.log('1. Logging in as admin...');
        const loginResponse = await client.post('/login/admin', {
            email: 'admin@school.com',
            password: 'admin123'
        });
        console.log('   📊 Login Status:', loginResponse.status);
        console.log('   📍 Login Redirect:', loginResponse.headers.location);

        // Step 2: Check cookies after login
        console.log('\n2. Checking cookies after login...');
        const cookies = client.defaults.headers.Cookie || '';
        console.log('   🍪 Cookies:', cookies);
        
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

        // Step 3: Test announcements page access
        console.log('\n3. Testing announcements page access...');
        try {
            const announcementsResponse = await client.get('/announcements');
            console.log('   📊 Status:', announcementsResponse.status);
            if (announcementsResponse.status === 200) {
                console.log('   ✅ Announcements page accessible');
            } else {
                console.log('   ❌ Cannot access announcements page');
                console.log('   📍 Redirect:', announcementsResponse.headers.location);
            }
        } catch (error) {
            console.log('   ❌ Error accessing announcements page');
            console.log('   📊 Error Status:', error.response?.status);
            console.log('   📍 Error Redirect:', error.response?.headers?.location);
        }

        // Step 4: Test delete route directly
        console.log('\n4. Testing delete route directly...');
        try {
            const deleteResponse = await client.delete('/announcements/test-id-123');
            console.log('   📊 Delete Status:', deleteResponse.status);
            console.log('   📄 Delete Response:', deleteResponse.data);
            
            if (deleteResponse.status === 404) {
                console.log('   ✅ Delete route working (404 for invalid ID is expected)');
            } else if (deleteResponse.status === 401) {
                console.log('   ❌ Authentication issue with delete route');
            } else if (deleteResponse.status === 403) {
                console.log('   ❌ Permission issue with delete route');
            } else {
                console.log('   ⚠️  Unexpected response from delete route');
            }
        } catch (error) {
            console.log('   ❌ Error with delete route');
            console.log('   📊 Error Status:', error.response?.status);
            console.log('   📄 Error Data:', error.response?.data);
            
            if (error.response?.status === 404) {
                console.log('   ✅ Delete route working (404 for invalid ID is expected)');
            } else if (error.response?.status === 401) {
                console.log('   ❌ Authentication issue with delete route');
            } else if (error.response?.status === 403) {
                console.log('   ❌ Permission issue with delete route');
            }
        }

        // Step 5: Test POST fallback route
        console.log('\n5. Testing POST fallback route...');
        try {
            const postDeleteResponse = await client.post('/announcements/test-id-123/delete');
            console.log('   📊 POST Delete Status:', postDeleteResponse.status);
            console.log('   📍 POST Delete Redirect:', postDeleteResponse.headers.location);
            
            if (postDeleteResponse.status === 302) {
                console.log('   ✅ POST delete route working (redirect expected)');
            } else {
                console.log('   ⚠️  Unexpected response from POST delete route');
            }
        } catch (error) {
            console.log('   ❌ Error with POST delete route');
            console.log('   📊 Error Status:', error.response?.status);
            console.log('   📍 Error Redirect:', error.response?.headers?.location);
        }

        console.log('\n🎉 Debug completed!');

    } catch (error) {
        console.error('❌ Debug failed:', error.message);
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Data:', error.response.data);
        }
    }
}

debugAnnouncementDelete(); 