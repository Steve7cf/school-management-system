require('dotenv').config();
const mongoose = require('mongoose');
const Grade = require('../models/grade');
const Student = require('../models/student');
const Exam = require('../models/Exam');
const Subject = require('../models/Subject');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/school_management';

async function testResults() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // Check if we have students, exams, and subjects
        const students = await Student.find().limit(1);
        const exams = await Exam.find().populate('subject').limit(1);
        const subjects = await Subject.find().limit(1);

        console.log(`📊 Data Overview:`);
        console.log(`   Students: ${students.length}`);
        console.log(`   Exams: ${exams.length}`);
        console.log(`   Subjects: ${subjects.length}`);

        if (students.length === 0) {
            console.log('❌ No students found. Please seed students first.');
            return;
        }

        if (exams.length === 0) {
            console.log('❌ No exams found. Please seed exams first.');
            return;
        }

        // Test creating a result
        const testStudent = students[0];
        const testExam = exams[0];

        console.log(`\n🧪 Testing with:`);
        console.log(`   Student: ${testStudent.firstName} ${testStudent.lastName} (${testStudent.studentId})`);
        console.log(`   Exam: ${testExam.name} - ${testExam.subject ? testExam.subject.name : 'Unknown Subject'}`);

        // Check if result already exists
        const existingResult = await Grade.findOne({
            studentId: testStudent.studentId,
            examId: testExam._id
        });

        if (existingResult) {
            console.log('⚠️  Test result already exists. Skipping creation.');
            console.log(`   Existing result: ${existingResult.grade} (${existingResult.marksObtained}/${existingResult.totalMarks})`);
        } else {
            // Create a test result
            const testResult = new Grade({
                studentId: testStudent.studentId,
                subject: testExam.subject ? testExam.subject.name : 'Test Subject',
                examType: testExam.type || 'Test',
                grade: 'A',
                marksObtained: 85,
                totalMarks: 100,
                remarks: 'Test result for debugging',
                examId: testExam._id,
                studentName: `${testStudent.firstName} ${testStudent.lastName}`,
                examDate: testExam.date || new Date()
            });

            await testResult.save();
            console.log('✅ Test result created successfully!');
        }

        // Retrieve and display all results
        const allResults = await Grade.find().populate('examId');
        console.log(`\n📋 All Results (${allResults.length}):`);
        
        allResults.forEach((result, index) => {
            console.log(`   ${index + 1}. ${result.studentName} - ${result.subject} - ${result.grade} (${result.marksObtained}/${result.totalMarks})`);
        });

        // Test the results route logic
        console.log(`\n🔍 Testing results processing logic...`);
        const processedResults = allResults.map(result => {
            return {
                ...result.toObject(),
                student: { firstName: result.studentName.split(' ')[0], lastName: result.studentName.split(' ')[1] || '' },
                classObj: { name: 'Test Class', section: 'A' },
                exam: { 
                    subject: { name: result.subject }, 
                    type: result.examType, 
                    class: { name: 'Test Class', section: 'A' } 
                }
            };
        });

        console.log(`✅ Processed ${processedResults.length} results successfully`);

    } catch (error) {
        console.error('❌ Error testing results:', error);
    } finally {
        await mongoose.connection.close();
        console.log('🔌 MongoDB connection closed');
    }
}

testResults(); 