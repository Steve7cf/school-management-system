const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();

// Import models
const Student = require('../models/student');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/school_management')
.then(() => {
    console.log('✅ Connected to MongoDB successfully');
})
.catch((err) => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
});

// Test student login functionality
const testStudentLogin = async () => {
    try {
        console.log('🧪 Testing Student Login Functionality...\n');
        
        // 1. Check if there are any students in the database
        console.log('1. Checking for students in database...');
        const students = await Student.find({});
        console.log(`Found ${students.length} students in database`);
        
        if (students.length === 0) {
            console.log('❌ No students found in database. Creating a test student...');
            
            // Create a test student
            const testPassword = 'test123';
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(testPassword, salt);
            
            const testStudent = new Student({
                firstName: 'Test',
                lastName: 'Student',
                studentId: 'F1/2024/1001',
                dateOfBirth: '2010-01-01',
                password: hashedPassword,
                gradeLevel: '1',
                parentEmail: 'parent@test.com',
                section: 'A',
                gender: 'male',
                address: 'Test Address'
            });
            
            await testStudent.save();
            console.log('✅ Test student created successfully');
            console.log(`Student ID: ${testStudent.studentId}`);
            console.log(`Password: ${testPassword}`);
        } else {
            console.log('✅ Students found in database:');
            students.forEach((student, index) => {
                console.log(`${index + 1}. ${student.firstName} ${student.lastName} - ${student.studentId}`);
            });
        }
        
        // 2. Test password hashing and comparison
        console.log('\n2. Testing password functionality...');
        const testStudent = await Student.findOne({});
        if (testStudent) {
            console.log(`Testing with student: ${testStudent.studentId}`);
            
            // Test with correct password
            const correctPassword = 'test123';
            const isMatch = await bcrypt.compare(correctPassword, testStudent.password);
            console.log(`Password match test: ${isMatch ? '✅ PASS' : '❌ FAIL'}`);
            
            // Test with wrong password
            const wrongPassword = 'wrongpassword';
            const isWrongMatch = await bcrypt.compare(wrongPassword, testStudent.password);
            console.log(`Wrong password test: ${!isWrongMatch ? '✅ PASS' : '❌ FAIL'}`);
        }
        
        // 3. Test student lookup by studentId
        console.log('\n3. Testing student lookup...');
        const testStudentId = 'F1/2024/1001';
        const foundStudent = await Student.findOne({ studentId: testStudentId });
        
        if (foundStudent) {
            console.log(`✅ Student found: ${foundStudent.firstName} ${foundStudent.lastName}`);
            console.log(`Role: ${foundStudent.role}`);
            console.log(`Grade Level: ${foundStudent.gradeLevel}`);
            console.log(`Section: ${foundStudent.section}`);
        } else {
            console.log(`❌ Student with ID ${testStudentId} not found`);
        }
        
        // 4. Check student model validation
        console.log('\n4. Testing student model validation...');
        const studentSchema = Student.schema;
        const gradeLevelField = studentSchema.path('gradeLevel');
        const sectionField = studentSchema.path('section');
        const genderField = studentSchema.path('gender');
        
        console.log(`Grade Level enum: ${JSON.stringify(gradeLevelField.enumValues)}`);
        console.log(`Section enum: ${JSON.stringify(sectionField.enumValues)}`);
        console.log(`Gender enum: ${JSON.stringify(genderField.enumValues)}`);
        
        // 5. Test session and cookie simulation
        console.log('\n5. Testing session simulation...');
        const mockSession = {
            user: {
                id: foundStudent ? foundStudent._id : 'test-id',
                firstName: foundStudent ? foundStudent.firstName : 'Test',
                lastName: foundStudent ? foundStudent.lastName : 'Student',
                studentId: foundStudent ? foundStudent.studentId : 'F1/2024/1001',
                gradeLevel: foundStudent ? foundStudent.gradeLevel : '1',
                role: 'student'
            }
        };
        
        console.log('Mock session created:', JSON.stringify(mockSession, null, 2));
        
        console.log('\n🎉 Student login test completed!');
        console.log('\n📋 Summary:');
        console.log('- Check if students exist in database');
        console.log('- Verify password hashing works correctly');
        console.log('- Confirm student lookup by studentId works');
        console.log('- Validate model schema constraints');
        console.log('- Test session structure');
        
        if (students.length === 0) {
            console.log('\n💡 To test login, use:');
            console.log(`Student ID: F1/2024/1001`);
            console.log(`Password: test123`);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        mongoose.connection.close();
    }
};

// Run test if this file is executed directly
if (require.main === module) {
    testStudentLogin();
}

module.exports = testStudentLogin; 