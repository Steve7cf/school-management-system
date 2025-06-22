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

async function testResultsFunctionality() {
    console.log('🧪 Testing Results CRUD Functionality...\n');
    
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
        
        // Step 2: Access results page
        console.log('\n2️⃣ Accessing results page...');
        const resultsResponse = await client.get('/results');
        console.log(`✅ Results page status: ${resultsResponse.status}`);
        
        if (resultsResponse.status === 200) {
            console.log('✅ Results page loaded successfully');
            
            // Check if there are any results displayed
            if (resultsResponse.data.includes('No results found')) {
                console.log('ℹ️  No results found in the system');
            } else {
                console.log('✅ Results found in the system');
            }
        }
        
        // Step 3: Access add results page
        console.log('\n3️⃣ Accessing add results page...');
        const addResultsResponse = await client.get('/results/add');
        console.log(`✅ Add results page status: ${addResultsResponse.status}`);
        
        if (addResultsResponse.status === 200) {
            console.log('✅ Add results page loaded successfully');
        }
        
        // Step 4: Test results edit route (if we had a result ID)
        console.log('\n4️⃣ Testing results edit route...');
        try {
            const editResultsResponse = await client.get('/results/edit/test-id-123', {
                maxRedirects: 0,
                validateStatus: function (status) {
                    return status >= 200 && status < 500;
                }
            });
            console.log(`✅ Edit results route status: ${editResultsResponse.status}`);
            
            if (editResultsResponse.status === 302) {
                console.log('✅ Edit route properly redirects when result not found');
            }
        } catch (error) {
            console.log(`⚠️  Edit results route: ${error.response?.status || error.message}`);
        }
        
        // Step 5: Test results delete route
        console.log('\n5️⃣ Testing results delete route...');
        try {
            const deleteResultsResponse = await client.post('/results/delete/test-id-123', {}, {
                maxRedirects: 0,
                validateStatus: function (status) {
                    return status >= 200 && status < 500;
                }
            });
            console.log(`✅ Delete results route status: ${deleteResultsResponse.status}`);
            
            if (deleteResultsResponse.status === 302) {
                console.log('✅ Delete route properly redirects when result not found');
            }
        } catch (error) {
            console.log(`⚠️  Delete results route: ${error.response?.status || error.message}`);
        }
        
        console.log('\n🎉 Results functionality test completed!');
        
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

// Test data processing
async function testDataProcessing() {
    console.log('\n🔍 Testing Results Data Processing...\n');
    
    try {
        const Grade = require('../models/grade');
        const Student = require('../models/student');
        const Class = require('../models/Class');
        const Exam = require('../models/Exam');
        
        // Test if models are properly imported
        console.log('✅ Grade model imported successfully');
        console.log('✅ Student model imported successfully');
        console.log('✅ Class model imported successfully');
        console.log('✅ Exam model imported successfully');
        
        // Test data structure
        const testResult = {
            studentId: 'TEST123',
            subject: 'Mathematics',
            examType: 'Term',
            grade: 'A',
            marksObtained: 85,
            totalMarks: 100,
            remarks: 'Good performance'
        };
        
        console.log('✅ Test result data structure created');
        console.log('   Student ID:', testResult.studentId);
        console.log('   Subject:', testResult.subject);
        console.log('   Exam Type:', testResult.examType);
        console.log('   Grade:', testResult.grade);
        
        console.log('\n🎉 Data processing test completed!');
        
    } catch (error) {
        console.error('❌ Data processing test failed:', error.message);
    }
}

// Run tests
async function runTests() {
    console.log('🚀 Starting Results Functionality Tests\n');
    console.log(`🌐 Base URL: ${BASE_URL}`);
    console.log(`👤 Test Email: ${TEST_EMAIL}`);
    console.log(`🔑 Test Password: ${TEST_PASSWORD}\n`);
    
    await testDataProcessing();
    await testResultsFunctionality();
}

// Run if this script is executed directly
if (require.main === module) {
    runTests().catch(console.error);
}

module.exports = { testResultsFunctionality, testDataProcessing }; 