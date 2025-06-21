require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Student = require('../models/student');
const Teacher = require('../models/teacher');
const Parent = require('../models/parent');
const Admin = require('../models/admin');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/school_management';

async function debugLogin() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        console.log('\n🔍 Checking user accounts...\n');

        // Check students
        const students = await Student.find().limit(3);
        console.log(`📚 Students (${students.length}):`);
        students.forEach(student => {
            console.log(`   - ${student.firstName} ${student.lastName} (${student.studentId})`);
            console.log(`     Email: ${student.parentEmail}`);
            console.log(`     Password hash: ${student.password.substring(0, 20)}...`);
        });

        // Check teachers
        const teachers = await Teacher.find().limit(3);
        console.log(`\n👨‍🏫 Teachers (${teachers.length}):`);
        teachers.forEach(teacher => {
            console.log(`   - ${teacher.firstName} ${teacher.lastName} (${teacher.teacherId})`);
            console.log(`     Email: ${teacher.email}`);
            console.log(`     Password hash: ${teacher.password.substring(0, 20)}...`);
        });

        // Check parents
        const parents = await Parent.find().limit(3);
        console.log(`\n👨‍👩‍👧‍👦 Parents (${parents.length}):`);
        parents.forEach(parent => {
            console.log(`   - ${parent.firstName} ${parent.lastName}`);
            console.log(`     Email: ${parent.email}`);
            console.log(`     Student ID: ${parent.studentId}`);
            console.log(`     Password hash: ${parent.password.substring(0, 20)}...`);
        });

        // Check admins
        const admins = await Admin.find().limit(3);
        console.log(`\n👨‍💼 Admins (${admins.length}):`);
        admins.forEach(admin => {
            console.log(`   - ${admin.firstName} ${admin.lastName}`);
            console.log(`     Email: ${admin.email}`);
            console.log(`     Password hash: ${admin.password.substring(0, 20)}...`);
        });

        // Test password hashing
        console.log('\n🔐 Testing password hashing...');
        const testPassword = 'test123';
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(testPassword, salt);
        const isMatch = await bcrypt.compare(testPassword, hashedPassword);
        console.log(`   Test password: ${testPassword}`);
        console.log(`   Hash: ${hashedPassword.substring(0, 20)}...`);
        console.log(`   Verification: ${isMatch ? '✅ PASS' : '❌ FAIL'}`);

        // Test with actual user passwords
        if (students.length > 0) {
            console.log('\n🧪 Testing with actual student password...');
            const student = students[0];
            const testStudentPassword = 'student123'; // Common test password
            const studentMatch = await bcrypt.compare(testStudentPassword, student.password);
            console.log(`   Student: ${student.firstName} ${student.lastName}`);
            console.log(`   Test password: ${testStudentPassword}`);
            console.log(`   Match: ${studentMatch ? '✅ YES' : '❌ NO'}`);
        }

        console.log('\n📋 Environment Info:');
        console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
        console.log(`   Database: ${MONGO_URI.includes('localhost') ? 'Local' : 'Production'}`);
        console.log(`   Session Secret: ${process.env.SESSION_SECRET ? '✅ Set' : '❌ Missing'}`);

    } catch (error) {
        console.error('❌ Error during debug:', error);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 MongoDB connection closed');
    }
}

debugLogin(); 