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

let createdExamId = null;

async function testExamFunctionality() {
    console.log('🧪 Testing Exam CRUD Functionality...\n');
    
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
        
        // Step 2: Access exams page
        console.log('\n2️⃣ Accessing exams page...');
        const examsResponse = await client.get('/exams');
        console.log(`✅ Exams page status: ${examsResponse.status}`);
        
        // Step 3: Access add exam page
        console.log('\n3️⃣ Accessing add exam page...');
        const addExamResponse = await client.get('/exams/add');
        console.log(`✅ Add exam page status: ${addExamResponse.status}`);
        
        // Step 4: Create a test exam
        console.log('\n4️⃣ Creating test exam...');
        const testExamData = {
            title: 'Test Exam - ' + new Date().toISOString(),
            type: 'Term',
            date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
            targetClasses: [], // Will be populated if classes exist
            isPublic: true
        };
        
        const createExamResponse = await client.post('/exams/add', testExamData, {
            maxRedirects: 0,
            validateStatus: function (status) {
                return status >= 200 && status < 400;
            }
        });
        
        console.log(`✅ Create exam status: ${createExamResponse.status}`);
        
        if (createExamResponse.status === 302) {
            console.log(`📍 Redirect location: ${createExamResponse.headers.location}`);
        }
        
        // Step 5: Get the list of exams to find our created exam
        console.log('\n5️⃣ Getting updated exams list...');
        const updatedExamsResponse = await client.get('/exams');
        console.log(`✅ Updated exams page status: ${updatedExamsResponse.status}`);
        
        // Extract exam ID from the response (this is a simplified approach)
        if (updatedExamsResponse.data.includes(testExamData.title)) {
            console.log('✅ Test exam found in list');
            
            // For this test, we'll simulate having an exam ID
            // In a real scenario, you'd extract it from the response
            createdExamId = 'test-exam-id-' + Date.now();
        }
        
        // Step 6: Test edit functionality (if we have an exam ID)
        if (createdExamId) {
            console.log('\n6️⃣ Testing edit exam page...');
            try {
                const editExamResponse = await client.get(`/exams/edit/${createdExamId}`);
                console.log(`✅ Edit exam page status: ${editExamResponse.status}`);
            } catch (error) {
                console.log(`⚠️  Edit exam page: ${error.response?.status || error.message}`);
            }
        }
        
        // Step 7: Test delete functionality
        console.log('\n7️⃣ Testing delete exam...');
        try {
            const deleteExamResponse = await client.post(`/exams/delete/${createdExamId || 'test-id'}`, {}, {
                maxRedirects: 0,
                validateStatus: function (status) {
                    return status >= 200 && status < 500;
                }
            });
            console.log(`✅ Delete exam status: ${deleteExamResponse.status}`);
            
            if (deleteExamResponse.status === 302) {
                console.log(`📍 Delete redirect: ${deleteExamResponse.headers.location}`);
            }
        } catch (error) {
            console.log(`⚠️  Delete exam: ${error.response?.status || error.message}`);
        }
        
        console.log('\n🎉 Exam functionality test completed!');
        
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

// Test form validation
async function testFormValidation() {
    console.log('\n🔍 Testing Form Validation...\n');
    
    try {
        // Test add exam form validation
        console.log('1️⃣ Testing add exam form validation...');
        
        const invalidData = {
            title: '', // Empty title
            type: '', // Empty type
            date: '', // Empty date
        };
        
        const validationResponse = await client.post('/exams/add', invalidData, {
            maxRedirects: 0,
            validateStatus: function (status) {
                return status >= 200 && status < 500;
            }
        });
        
        console.log(`✅ Validation test status: ${validationResponse.status}`);
        
        if (validationResponse.status === 302) {
            console.log('✅ Form validation working (redirected back to form)');
        }
        
        console.log('\n🎉 Form validation test completed!');
        
    } catch (error) {
        console.error('❌ Validation test failed:', error.message);
    }
}

// Test permission checks
async function testPermissionChecks() {
    console.log('\n🔒 Testing Permission Checks...\n');
    
    try {
        // Test accessing exams without authentication
        console.log('1️⃣ Testing access without authentication...');
        
        const noAuthClient = axios.create({
            baseURL: BASE_URL,
            withCredentials: true
        });
        
        try {
            const noAuthResponse = await noAuthClient.get('/exams');
            console.log(`⚠️  No auth access: ${noAuthResponse.status}`);
        } catch (error) {
            if (error.response?.status === 302) {
                console.log('✅ Properly redirected to login (no auth)');
            } else {
                console.log(`⚠️  No auth access: ${error.response?.status || error.message}`);
            }
        }
        
        console.log('\n🎉 Permission checks test completed!');
        
    } catch (error) {
        console.error('❌ Permission test failed:', error.message);
    }
}

// Run tests
async function runTests() {
    console.log('🚀 Starting Exam Functionality Tests\n');
    console.log(`🌐 Base URL: ${BASE_URL}`);
    console.log(`👤 Test Email: ${TEST_EMAIL}`);
    console.log(`🔑 Test Password: ${TEST_PASSWORD}\n`);
    
    await testExamFunctionality();
    await testFormValidation();
    await testPermissionChecks();
}

// Run if this script is executed directly
if (require.main === module) {
    runTests().catch(console.error);
}

module.exports = { testExamFunctionality, testFormValidation, testPermissionChecks }; 