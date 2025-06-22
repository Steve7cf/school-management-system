const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/school_management');

async function debugResultsUpdate() {
    console.log('🔍 Debugging Results Update Process...\n');
    
    try {
        const Grade = require('../models/grade');
        const Student = require('../models/student');
        const Exam = require('../models/Exam');
        
        // Check if we have any results
        const results = await Grade.find().limit(5);
        console.log(`📊 Found ${results.length} results in database`);
        
        if (results.length === 0) {
            console.log('❌ No results found in database');
            return;
        }
        
        // Show first result details
        const firstResult = results[0];
        console.log('\n📝 First Result Details:');
        console.log(`   ID: ${firstResult._id}`);
        console.log(`   Student ID: ${firstResult.studentId}`);
        console.log(`   Subject: ${firstResult.subject}`);
        console.log(`   Grade: ${firstResult.grade}`);
        console.log(`   Marks: ${firstResult.marksObtained}/${firstResult.totalMarks}`);
        console.log(`   Exam ID: ${firstResult.examId || 'Not set'}`);
        console.log(`   Created: ${firstResult.createdAt}`);
        console.log(`   Updated: ${firstResult.updatedAt}`);
        
        // Find related student
        const student = await Student.findOne({ studentId: firstResult.studentId });
        if (student) {
            console.log('\n👤 Related Student:');
            console.log(`   ID: ${student._id}`);
            console.log(`   Name: ${student.firstName} ${student.lastName}`);
            console.log(`   Student ID: ${student.studentId}`);
        } else {
            console.log('\n❌ Related student not found');
        }
        
        // Find related exam
        let exam = null;
        if (firstResult.examId) {
            exam = await Exam.findById(firstResult.examId);
        }
        
        if (exam) {
            console.log('\n📚 Related Exam:');
            console.log(`   ID: ${exam._id}`);
            console.log(`   Title: ${exam.title}`);
            console.log(`   Type: ${exam.type}`);
        } else {
            console.log('\n❌ Related exam not found');
        }
        
        // Test update functionality
        console.log('\n🧪 Testing Update Functionality...');
        
        const originalGrade = firstResult.grade;
        const originalMarks = firstResult.marksObtained;
        
        // Try to update the result
        const updateData = {
            grade: originalGrade === 'A' ? 'B' : 'A',
            marksObtained: originalMarks === 85 ? 90 : 85,
            totalMarks: firstResult.totalMarks,
            remarks: 'Test update from debug script'
        };
        
        console.log('📝 Attempting to update with data:', updateData);
        
        const updatedResult = await Grade.findByIdAndUpdate(
            firstResult._id,
            updateData,
            { new: true, runValidators: true }
        );
        
        if (updatedResult) {
            console.log('✅ Update successful!');
            console.log(`   New Grade: ${updatedResult.grade} (was: ${originalGrade})`);
            console.log(`   New Marks: ${updatedResult.marksObtained} (was: ${originalMarks})`);
            console.log(`   Updated At: ${updatedResult.updatedAt}`);
            
            // Verify the update by fetching again
            const verifyResult = await Grade.findById(firstResult._id);
            console.log('\n🔍 Verification:');
            console.log(`   Grade: ${verifyResult.grade}`);
            console.log(`   Marks: ${verifyResult.marksObtained}`);
            console.log(`   Updated: ${verifyResult.updatedAt}`);
            
        } else {
            console.log('❌ Update failed');
        }
        
        // Check if there are any validation issues
        console.log('\n🔍 Checking Grade Model Schema...');
        const gradeSchema = Grade.schema.obj;
        console.log('Grade schema fields:', Object.keys(gradeSchema));
        
        // Test creating a new result
        console.log('\n🧪 Testing Create Functionality...');
        if (student && exam) {
            const newResultData = {
                studentId: student.studentId,
                subject: exam.subject?.name || 'Test Subject',
                examType: exam.type,
                grade: 'A',
                marksObtained: 95,
                totalMarks: 100,
                remarks: 'Test result from debug script',
                examId: exam._id,
                studentName: `${student.firstName} ${student.lastName}`,
                examDate: exam.date
            };
            
            console.log('📝 Creating new result with data:', newResultData);
            
            const newResult = new Grade(newResultData);
            await newResult.save();
            
            console.log('✅ New result created successfully!');
            console.log(`   ID: ${newResult._id}`);
            console.log(`   Grade: ${newResult.grade}`);
            console.log(`   Marks: ${newResult.marksObtained}/${newResult.totalMarks}`);
            
        } else {
            console.log('❌ Cannot create test result - missing student or exam data');
        }
        
    } catch (error) {
        console.error('❌ Debug failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from database');
    }
}

// Run the debug function
debugResultsUpdate().catch(console.error); 