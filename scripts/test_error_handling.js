const axios = require('axios');

// Test error handling endpoints
const testErrorHandling = async () => {
    const baseUrl = 'http://localhost:4000';
    
    console.log('🧪 Testing Error Handling System...\n');
    
    try {
        // Test 404 error
        console.log('1. Testing 404 Error...');
        try {
            await axios.get(`${baseUrl}/non-existent-page`);
        } catch (error) {
            if (error.response && error.response.status === 302) {
                console.log('✅ 404 error redirects to error page');
            } else {
                console.log('❌ 404 error handling failed');
            }
        }
        
        // Test error page with parameters
        console.log('\n2. Testing Error Page with Parameters...');
        const errorResponse = await axios.get(`${baseUrl}/error?status=500&title=Test Error&message=This is a test error&suggestions=Test suggestion 1|Test suggestion 2`);
        if (errorResponse.status === 200) {
            console.log('✅ Error page loads correctly with parameters');
        } else {
            console.log('❌ Error page failed to load');
        }
        
        // Test uploads directory
        console.log('\n3. Testing Uploads Directory...');
        const fs = require('fs');
        const path = require('path');
        const uploadsDir = path.join(__dirname, '..', 'public', 'uploads', 'avatars');
        
        if (fs.existsSync(uploadsDir)) {
            console.log('✅ Uploads directory exists');
            
            // Check permissions
            try {
                fs.accessSync(uploadsDir, fs.constants.R_OK | fs.constants.W_OK);
                console.log('✅ Uploads directory has proper permissions');
            } catch (permError) {
                console.log('⚠️  Uploads directory permissions issue (this is normal on Windows)');
            }
        } else {
            console.log('❌ Uploads directory does not exist');
        }
        
        console.log('\n🎉 Error handling system test completed!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
};

// Run test if this file is executed directly
if (require.main === module) {
    testErrorHandling();
}

module.exports = testErrorHandling; 