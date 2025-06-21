require('dotenv').config();
const mongoose = require('mongoose');
const Teacher = require('./models/teacher');
const Subject = require('./models/Subject');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/school_management';

async function checkAndFixTeachers() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB...\n');

    console.log('=== TEACHER-SUBJECT RELATIONSHIP AUDIT ===\n');

    // Get all data
    const teachers = await Teacher.find().populate('subjects');
    const subjects = await Subject.find().populate('teacherId');

    console.log(`📊 Data Overview:`);
    console.log(`   Teachers: ${teachers.length}`);
    console.log(`   Subjects: ${subjects.length}\n`);

    // Check 1: Teachers with more than 3 subjects
    console.log('🔍 Check 1: Teachers with more than 3 subjects');
    const teachersWithTooManySubjects = teachers.filter(t => t.subjects.length > 3);
    if (teachersWithTooManySubjects.length > 0) {
      console.log('   ❌ Found teachers with more than 3 subjects:');
      teachersWithTooManySubjects.forEach(teacher => {
        console.log(`      - ${teacher.firstName} ${teacher.lastName}: ${teacher.subjects.length} subjects`);
      });
    } else {
      console.log('   ✅ All teachers have 3 or fewer subjects');
    }
    console.log('');

    // Check 2: Subjects with invalid teacherId
    console.log('🔍 Check 2: Subjects with invalid teacherId');
    const subjectsWithInvalidTeacher = subjects.filter(s => s.teacherId && !teachers.find(t => t._id.equals(s.teacherId._id)));
    if (subjectsWithInvalidTeacher.length > 0) {
      console.log('   ❌ Found subjects with invalid teacherId:');
      subjectsWithInvalidTeacher.forEach(subject => {
        console.log(`      - ${subject.name} (${subject.code}): teacherId ${subject.teacherId}`);
      });
    } else {
      console.log('   ✅ All subjects have valid teacherId references');
    }
    console.log('');

    // Check 3: Inconsistent relationships
    console.log('🔍 Check 3: Inconsistent teacher-subject relationships');
    let inconsistencyCount = 0;
    for (const subject of subjects) {
      if (subject.teacherId) {
        const teacher = teachers.find(t => t._id.equals(subject.teacherId._id));
        if (teacher && !teacher.subjects.find(s => s._id.equals(subject._id))) {
          console.log(`   ❌ Inconsistency: Subject ${subject.name} has teacherId ${subject.teacherId.firstName} ${subject.teacherId.lastName} but not in teacher's subjects array`);
          inconsistencyCount++;
        }
      }
    }
    if (inconsistencyCount === 0) {
      console.log('   ✅ All teacher-subject relationships are consistent');
    }
    console.log('');

    // Check 4: Teachers with subjects not in their subjects array
    console.log('🔍 Check 4: Teachers with subjects not in their subjects array');
    let orphanedInTeacherArray = 0;
    for (const teacher of teachers) {
      for (const subjectRef of teacher.subjects) {
        const subject = subjects.find(s => s._id.equals(subjectRef._id));
        if (!subject) {
          console.log(`   ❌ Teacher ${teacher.firstName} ${teacher.lastName} has non-existent subject in subjects array: ${subjectRef._id}`);
          orphanedInTeacherArray++;
        } else if (!subject.teacherId || !subject.teacherId._id.equals(teacher._id)) {
          console.log(`   ❌ Teacher ${teacher.firstName} ${teacher.lastName} has subject ${subject.name} in subjects array but subject.teacherId is ${subject.teacherId ? subject.teacherId.firstName + ' ' + subject.teacherId.lastName : 'null'}`);
          orphanedInTeacherArray++;
        }
      }
    }
    if (orphanedInTeacherArray === 0) {
      console.log('   ✅ All teacher subjects arrays are consistent');
    }
    console.log('');

    // Summary
    console.log('📋 SUMMARY:');
    console.log(`   Teachers with too many subjects: ${teachersWithTooManySubjects.length}`);
    console.log(`   Subjects with invalid teacherId: ${subjectsWithInvalidTeacher.length}`);
    console.log(`   Inconsistent relationships: ${inconsistencyCount}`);
    console.log(`   Orphaned references in teacher arrays: ${orphanedInTeacherArray}`);
    console.log('');

    // Ask if user wants to fix issues
    const totalIssues = teachersWithTooManySubjects.length + subjectsWithInvalidTeacher.length + inconsistencyCount + orphanedInTeacherArray;
    
    if (totalIssues > 0) {
      console.log(`🚨 Found ${totalIssues} issues that need fixing.`);
      console.log('Run "node fix_teacher_subjects.js" to fix these issues.\n');
    } else {
      console.log('✅ No issues found! Teacher-subject relationships are healthy.\n');
    }

    // Display current assignments
    console.log('📋 CURRENT TEACHER-SUBJECT ASSIGNMENTS:');
    for (const teacher of teachers) {
      const teacherSubjects = subjects.filter(s => s.teacherId && s.teacherId._id.equals(teacher._id));
      console.log(`   ${teacher.firstName} ${teacher.lastName} (${teacher.teacherId}): ${teacherSubjects.length} subjects`);
      teacherSubjects.forEach(subject => {
        console.log(`      - ${subject.name} (${subject.code})`);
      });
    }

  } catch (err) {
    console.error('Error checking teacher-subject relationships:', err);
  } finally {
    console.log('\nClosing MongoDB connection.');
    mongoose.connection.close();
  }
}

checkAndFixTeachers();
