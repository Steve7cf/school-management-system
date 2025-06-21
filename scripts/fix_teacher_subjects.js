const mongoose = require('mongoose');
const Teacher = require('./models/teacher');
const Subject = require('./models/Subject');
require('dotenv').config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/school_management';

async function fixTeacherSubjects() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB...');

    // Get all teachers
    const teachers = await Teacher.find();
    console.log(`Found ${teachers.length} teachers`);

    // Get all subjects
    const subjects = await Subject.find();
    console.log(`Found ${subjects.length} subjects`);

    console.log('\n=== Starting Teacher-Subject Relationship Fix ===\n');

    // Clear all teachers' subjects arrays first
    for (const teacher of teachers) {
      teacher.subjects = [];
      await teacher.save();
      console.log(`✓ Cleared subjects for teacher ${teacher.firstName} ${teacher.lastName}`);
    }

    // Rebuild teacher-subject relationships based on Subject.teacherId
    let assignedCount = 0;
    let orphanedCount = 0;
    let errorCount = 0;

    for (const subject of subjects) {
      if (subject.teacherId) {
        const teacher = await Teacher.findById(subject.teacherId);
        if (teacher) {
          try {
            await teacher.addSubject(subject._id);
            assignedCount++;
            console.log(`✓ Assigned subject ${subject.name} (${subject.code}) to teacher ${teacher.firstName} ${teacher.lastName}`);
          } catch (error) {
            errorCount++;
            console.log(`✗ Error assigning subject ${subject.name} to teacher ${teacher.firstName} ${teacher.lastName}: ${error.message}`);
          }
        } else {
          orphanedCount++;
          console.log(`⚠ Subject ${subject.name} (${subject.code}) has invalid teacherId: ${subject.teacherId}`);
          // Clear the invalid teacherId
          await Subject.findByIdAndUpdate(subject._id, { teacherId: null });
        }
      } else {
        console.log(`- Subject ${subject.name} (${subject.code}) has no teacher assigned`);
      }
    }

    // Display final state
    console.log('\n=== Final Teacher-Subject Assignments ===');
    for (const teacher of teachers) {
      const teacherSubjects = await Subject.find({ teacherId: teacher._id });
      console.log(`${teacher.firstName} ${teacher.lastName} (${teacher.teacherId}): ${teacherSubjects.length} subjects`);
      teacherSubjects.forEach(subject => {
        console.log(`  - ${subject.name} (${subject.code})`);
      });
    }

    console.log('\n=== Summary ===');
    console.log(`Total teachers: ${teachers.length}`);
    console.log(`Total subjects: ${subjects.length}`);
    console.log(`Successfully assigned: ${assignedCount}`);
    console.log(`Orphaned subjects fixed: ${orphanedCount}`);
    console.log(`Errors encountered: ${errorCount}`);

    // Verify data integrity
    console.log('\n=== Data Integrity Check ===');
    const orphanedSubjects = await Subject.find({ teacherId: { $exists: true, $ne: null } });
    const teachersWithSubjects = await Teacher.find({ subjects: { $exists: true, $ne: [] } });
    
    console.log(`Subjects with teacherId: ${orphanedSubjects.length}`);
    console.log(`Teachers with subjects array: ${teachersWithSubjects.length}`);
    
    // Check for inconsistencies
    for (const subject of orphanedSubjects) {
      const teacher = await Teacher.findById(subject.teacherId);
      if (!teacher) {
        console.log(`⚠ Inconsistency: Subject ${subject.name} has teacherId ${subject.teacherId} but teacher doesn't exist`);
      } else if (!teacher.subjects.includes(subject._id)) {
        console.log(`⚠ Inconsistency: Subject ${subject.name} has teacherId ${subject.teacherId} but not in teacher's subjects array`);
      }
    }

  } catch (err) {
    console.error('Error fixing teacher subjects:', err);
  } finally {
    console.log('\nClosing MongoDB connection.');
    mongoose.connection.close();
  }
}

fixTeacherSubjects();
