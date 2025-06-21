const mongoose = require('mongoose');
const Student = require('./models/student');
const Subject = require('./models/Subject');
require('dotenv').config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/school_management';

async function updateStudentSubjects() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB...');

    // Find all students
    const students = await Student.find();
    console.log(`Found ${students.length} students`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const student of students) {
      // Check if student already has subjects assigned
      if (student.subjects && student.subjects.length > 0) {
        console.log(`Student ${student.studentId} already has ${student.subjects.length} subjects assigned. Skipping.`);
        skippedCount++;
        continue;
      }

      // Find subjects for the student's grade level
      const subjects = await Subject.find({ gradeLevel: parseInt(student.gradeLevel) });
      
      if (subjects.length > 0) {
        // Assign subjects to the student
        student.subjects = subjects.map(subject => subject._id);
        await student.save();
        console.log(`Assigned ${subjects.length} subjects to student ${student.studentId} (Grade ${student.gradeLevel})`);
        updatedCount++;
      } else {
        console.log(`No subjects found for Grade ${student.gradeLevel}. Student ${student.studentId} not updated.`);
      }
    }

    console.log(`\nUpdate complete!`);
    console.log(`- Updated: ${updatedCount} students`);
    console.log(`- Skipped: ${skippedCount} students (already had subjects)`);

  } catch (err) {
    console.error('Error updating student subjects:', err);
  } finally {
    console.log('Closing MongoDB connection.');
    mongoose.connection.close();
  }
}

updateStudentSubjects(); 