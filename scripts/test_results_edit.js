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

async function testResultsEdit() {
    console.log('🧪 Testing Results Edit Functionality...\n');
    
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
        
        // Step 2: Get results list to find a result to edit
        console.log('\n2️⃣ Getting results list...');
        const resultsResponse = await client.get('/results');
        console.log(`✅ Results page status: ${resultsResponse.status}`);
        
        if (resultsResponse.status === 200) {
            // Look for edit links in the response
            const editLinks = resultsResponse.data.match(/\/results\/edit\/[a-f0-9]{24}/g);
            if (editLinks && editLinks.length > 0) {
                const resultId = editLinks[0].split('/').pop();
                console.log(`✅ Found result to edit: ${resultId}`);
                
                // Step 3: Access edit page
                console.log('\n3️⃣ Accessing edit page...');
                const editPageResponse = await client.get(`/results/edit/${resultId}`);
                console.log(`✅ Edit page status: ${editPageResponse.status}`);
                
                if (editPageResponse.status === 200) {
                    console.log('✅ Edit page loaded successfully');
                    
                    // Check if form fields are present
                    const hasForm = editPageResponse.data.includes('form action="/results/edit/');
                    const hasMarksField = editPageResponse.data.includes('name="marksObtained"');
                    const hasTotalField = editPageResponse.data.includes('name="totalMarks"');
                    const hasGradeField = editPageResponse.data.includes('name="grade"');
                    const hasStudentId = editPageResponse.data.includes('name="studentId"');
                    const hasExamId = editPageResponse.data.includes('name="examId"');
                    
                    console.log(`✅ Form present: ${hasForm}`);
                    console.log(`✅ Marks field: ${hasMarksField}`);
                    console.log(`✅ Total field: ${hasTotalField}`);
                    console.log(`✅ Grade field: ${hasGradeField}`);
                    console.log(`✅ Student ID field: ${hasStudentId}`);
                    console.log(`✅ Exam ID field: ${hasExamId}`);
                    
                    // Step 4: Test form submission
                    console.log('\n4️⃣ Testing form submission...');
                    try {
                        const updateData = {
                            marksObtained: '85',
                            totalMarks: '100',
                            grade: 'A',
                            remarks: 'Test update from script',
                            studentId: '', // Will be filled by hidden field
                            examId: ''     // Will be filled by hidden field
                        };
                        
                        const updateResponse = await client.post(`/results/edit/${resultId}`, updateData, {
                            maxRedirects: 0,
                            validateStatus: function (status) {
                                return status >= 200 && status < 400;
                            }
                        });
                        
                        console.log(`✅ Update response status: ${updateResponse.status}`);
                        
                        if (updateResponse.status === 302) {
                            console.log('✅ Update request processed (redirected)');
                        }
                        
                    } catch (error) {
                        console.log(`⚠️  Update test: ${error.response?.status || error.message}`);
                        if (error.response?.data) {
                            console.log(`Response data: ${error.response.data.substring(0, 200)}`);
                        }
                    }
                    
                } else {
                    console.log('❌ Edit page failed to load');
                }
            } else {
                console.log('ℹ️  No results found to edit');
            }
        }
        
        console.log('\n🎉 Results edit test completed!');
        
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

// Test database models
async function testModels() {
    console.log('\n🔍 Testing Database Models...\n');
    
    try {
        const mongoose = require('mongoose');
        const Grade = require('../models/grade');
        const Student = require('../models/student');
        const Exam = require('../models/Exam');
        
        // Test if we can find a result
        const result = await Grade.findOne();
        if (result) {
            console.log('✅ Found result in database');
            console.log(`   ID: ${result._id}`);
            console.log(`   Student ID: ${result.studentId}`);
            console.log(`   Subject: ${result.subject}`);
            console.log(`   Grade: ${result.grade}`);
            console.log(`   Exam ID: ${result.examId || 'Not set'}`);
            
            // Test finding related student
            const student = await Student.findOne({ studentId: result.studentId });
            if (student) {
                console.log('✅ Found related student');
                console.log(`   Student ID: ${student._id}`);
                console.log(`   Name: ${student.firstName} ${student.lastName}`);
            } else {
                console.log('❌ Related student not found');
            }
            
            // Test finding related exam
            if (result.examId) {
                const exam = await Exam.findById(result.examId);
                if (exam) {
                    console.log('✅ Found related exam');
                    console.log(`   Exam ID: ${exam._id}`);
                    console.log(`   Title: ${exam.title}`);
                } else {
                    console.log('❌ Related exam not found');
                }
            } else {
                console.log('ℹ️  Result has no examId set');
            }
            
        } else {
            console.log('ℹ️  No results found in database');
        }
        
    } catch (error) {
        console.error('❌ Model test failed:', error.message);
    }
}

// Run tests
async function runTests() {
    console.log('🚀 Starting Results Edit Tests\n');
    console.log(`🌐 Base URL: ${BASE_URL}`);
    console.log(`👤 Test Email: ${TEST_EMAIL}`);
    console.log(`🔑 Test Password: ${TEST_PASSWORD}\n`);
    
    await testModels();
    await testResultsEdit();
}

// Run if this script is executed directly
if (require.main === module) {
    runTests().catch(console.error);
}

module.exports = { testResultsEdit, testModels }; 