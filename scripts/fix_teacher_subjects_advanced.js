const mongoose = require('mongoose');
const Teacher = require('./models/teacher');
const Subject = require('./models/Subject');
require('dotenv').config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/school_management';

async function fixTeacherSubjectsAdvanced() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB...\n');

    console.log('=== ADVANCED TEACHER-SUBJECT RELATIONSHIP FIX ===\n');

    // Get all teachers and subjects
    const teachers = await Teacher.find().populate('subjects');
    const subjects = await Subject.find().populate('teacherId');

    console.log(`📊 Data Overview:`);
    console.log(`   Teachers: ${teachers.length}`);
    console.log(`   Subjects: ${subjects.length}\n`);

    // Step 1: Clear all teacher subjects arrays
    console.log('🔄 Step 1: Clearing all teacher subjects arrays...');
    for (const teacher of teachers) {
      teacher.subjects = [];
      await teacher.save();
      console.log(`   ✓ Cleared subjects for ${teacher.firstName} ${teacher.lastName}`);
    }

    // Step 2: Clear all subject teacherId references
    console.log('\n🔄 Step 2: Clearing all subject teacherId references...');
    await Subject.updateMany({}, { teacherId: null });
    console.log('   ✓ Cleared all subject teacherId references');

    // Step 3: Redistribute subjects intelligently
    console.log('\n🔄 Step 3: Redistributing subjects to teachers...');
    
    const subjectsToAssign = subjects.filter(s => s.isActive);
    const availableTeachers = teachers.filter(t => t.subjects.length < 3);
    
    console.log(`   Subjects to assign: ${subjectsToAssign.length}`);
    console.log(`   Available teachers: ${availableTeachers.length}`);

    // If we don't have enough teachers, create some dummy teachers
    const neededTeachers = Math.ceil(subjectsToAssign.length / 3);
    const additionalTeachersNeeded = Math.max(0, neededTeachers - availableTeachers.length);
    
    if (additionalTeachersNeeded > 0) {
      console.log(`   ⚠ Need to create ${additionalTeachersNeeded} additional teachers`);
      
      for (let i = 0; i < additionalTeachersNeeded; i++) {
        const newTeacher = new Teacher({
          firstName: `Teacher`,
          lastName: `${i + 1}`,
          email: `teacher${i + 1}@school.com`,
          teacherId: `T${100 + i}`,
          password: '$2b$10$dummyhash', // Will be updated on first login
          role: 'teacher',
          subjects: [],
          assignedClasses: []
        });
        await newTeacher.save();
        availableTeachers.push(newTeacher);
        console.log(`   ✓ Created teacher: ${newTeacher.firstName} ${newTeacher.lastName}`);
      }
    }

    // Distribute subjects evenly among teachers
    let teacherIndex = 0;
    for (const subject of subjectsToAssign) {
      // Find next available teacher
      while (teacherIndex < availableTeachers.length && availableTeachers[teacherIndex].subjects.length >= 3) {
        teacherIndex++;
      }
      
      if (teacherIndex >= availableTeachers.length) {
        console.log(`   ⚠ No more teachers available for subject: ${subject.name}`);
        break;
      }

      const teacher = availableTeachers[teacherIndex];
      
      try {
        // Assign subject to teacher
        await teacher.addSubject(subject._id);
        console.log(`   ✓ Assigned ${subject.name} (${subject.code}) to ${teacher.firstName} ${teacher.lastName}`);
      } catch (error) {
        console.log(`   ✗ Error assigning ${subject.name} to ${teacher.firstName} ${teacher.lastName}: ${error.message}`);
      }
    }

    // Step 4: Display final state
    console.log('\n=== FINAL TEACHER-SUBJECT ASSIGNMENTS ===');
    const finalTeachers = await Teacher.find().populate('subjects');
    
    for (const teacher of finalTeachers) {
      console.log(`${teacher.firstName} ${teacher.lastName} (${teacher.teacherId}): ${teacher.subjects.length} subjects`);
      teacher.subjects.forEach(subject => {
        console.log(`  - ${subject.name} (${subject.code})`);
      });
    }

    // Step 5: Validation
    console.log('\n=== VALIDATION RESULTS ===');
    const validation = await validateFinalState();
    
    if (validation.totalIssues === 0) {
      console.log('✅ All teacher-subject relationships are now consistent!');
    } else {
      console.log(`⚠ Found ${validation.totalIssues} remaining issues:`);
      Object.entries(validation.issues).forEach(([issueType, issues]) => {
        if (issues.length > 0) {
          console.log(`   ${issueType}: ${issues.length}`);
        }
      });
    }

    console.log('\n=== SUMMARY ===');
    console.log(`Total teachers: ${finalTeachers.length}`);
    console.log(`Total subjects assigned: ${finalTeachers.reduce((sum, t) => sum + t.subjects.length, 0)}`);
    console.log(`Teachers with 3 subjects: ${finalTeachers.filter(t => t.subjects.length === 3).length}`);
    console.log(`Teachers with < 3 subjects: ${finalTeachers.filter(t => t.subjects.length < 3).length}`);

  } catch (err) {
    console.error('Error in advanced fix:', err);
  } finally {
    console.log('\nClosing MongoDB connection.');
    mongoose.connection.close();
  }
}

async function validateFinalState() {
  const teachers = await Teacher.find().populate('subjects');
  const subjects = await Subject.find().populate('teacherId');
  
  const issues = {
    teachersWithTooManySubjects: [],
    subjectsWithInvalidTeacher: [],
    inconsistentRelationships: [],
    orphanedReferences: []
  };

  // Check teachers with more than 3 subjects
  teachers.forEach(teacher => {
    if (teacher.subjects.length > 3) {
      issues.teachersWithTooManySubjects.push({
        teacherId: teacher._id,
        teacherName: `${teacher.firstName} ${teacher.lastName}`,
        subjectCount: teacher.subjects.length
      });
    }
  });

  // Check subjects with invalid teacherId
  subjects.forEach(subject => {
    if (subject.teacherId && !teachers.find(t => t._id.equals(subject.teacherId._id))) {
      issues.subjectsWithInvalidTeacher.push({
        subjectId: subject._id,
        subjectName: subject.name,
        invalidTeacherId: subject.teacherId._id
      });
    }
  });

  // Check inconsistent relationships
  subjects.forEach(subject => {
    if (subject.teacherId) {
      const teacher = teachers.find(t => t._id.equals(subject.teacherId._id));
      if (teacher && !teacher.subjects.find(s => s._id.equals(subject._id))) {
        issues.inconsistentRelationships.push({
          subjectId: subject._id,
          subjectName: subject.name,
          teacherId: subject.teacherId._id,
          teacherName: `${subject.teacherId.firstName} ${subject.teacherId.lastName}`
        });
      }
    }
  });

  return {
    totalIssues: Object.values(issues).reduce((sum, arr) => sum + arr.length, 0),
    issues
  };
}

fixTeacherSubjectsAdvanced(); 