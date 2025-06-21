const mongoose = require('mongoose');
const Teacher = require('./models/teacher');
const Subject = require('./models/Subject');
require('dotenv').config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/school_management';

async function cleanupDummyTeachers() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB...\n');

    console.log('=== CLEANUP DUMMY TEACHERS ===\n');

    // Get all teachers and subjects
    const allTeachers = await Teacher.find().populate('subjects');
    const subjects = await Subject.find().populate('teacherId');

    console.log(`📊 Current State:`);
    console.log(`   Total Teachers: ${allTeachers.length}`);
    console.log(`   Total Subjects: ${subjects.length}\n`);

    // Identify real teachers (not dummy ones)
    const realTeachers = allTeachers.filter(teacher => 
      !teacher.firstName.toLowerCase().includes('teacher') && 
      !teacher.teacherId.startsWith('T1')
    );

    const dummyTeachers = allTeachers.filter(teacher => 
      teacher.firstName.toLowerCase().includes('teacher') || 
      teacher.teacherId.startsWith('T1')
    );

    console.log(`🔍 Analysis:`);
    console.log(`   Real Teachers: ${realTeachers.length}`);
    console.log(`   Dummy Teachers: ${dummyTeachers.length}\n`);

    if (realTeachers.length === 0) {
      console.log('❌ No real teachers found! Cannot proceed with cleanup.');
      return;
    }

    // Step 1: Clear all subject assignments
    console.log('🔄 Step 1: Clearing all subject assignments...');
    await Subject.updateMany({}, { teacherId: null });
    console.log('   ✓ Cleared all subject teacherId references');

    // Clear all teacher subjects arrays
    for (const teacher of allTeachers) {
      teacher.subjects = [];
      await teacher.save();
    }
    console.log('   ✓ Cleared all teacher subjects arrays');

    // Step 2: Remove dummy teachers
    console.log('\n🔄 Step 2: Removing dummy teachers...');
    for (const dummyTeacher of dummyTeachers) {
      await Teacher.findByIdAndDelete(dummyTeacher._id);
      console.log(`   ✓ Removed dummy teacher: ${dummyTeacher.firstName} ${dummyTeacher.lastName} (${dummyTeacher.teacherId})`);
    }

    // Step 3: Assign subjects to real teachers (max 3 per teacher)
    console.log('\n🔄 Step 3: Assigning subjects to real teachers...');
    
    const subjectsToAssign = subjects.filter(s => s.isActive);
    const availableRealTeachers = realTeachers.filter(t => t.subjects.length < 3);
    
    console.log(`   Subjects to assign: ${subjectsToAssign.length}`);
    console.log(`   Available real teachers: ${availableRealTeachers.length}`);

    // Calculate how many subjects each real teacher can take
    const maxSubjectsPerTeacher = 3;
    const totalCapacity = availableRealTeachers.length * maxSubjectsPerTeacher;
    const subjectsToLeaveUnassigned = Math.max(0, subjectsToAssign.length - totalCapacity);

    console.log(`   Total teacher capacity: ${totalCapacity} subjects`);
    console.log(`   Subjects that will remain unassigned: ${subjectsToLeaveUnassigned}`);

    // Assign subjects to real teachers
    let teacherIndex = 0;
    let assignedCount = 0;
    
    for (const subject of subjectsToAssign) {
      // Find next available teacher
      while (teacherIndex < availableRealTeachers.length && availableRealTeachers[teacherIndex].subjects.length >= maxSubjectsPerTeacher) {
        teacherIndex++;
      }
      
      if (teacherIndex >= availableRealTeachers.length) {
        console.log(`   ⚠ No more teachers available. ${subjectsToAssign.length - assignedCount} subjects will remain unassigned.`);
        break;
      }

      const teacher = availableRealTeachers[teacherIndex];
      
      try {
        // Assign subject to teacher
        await teacher.addSubject(subject._id);
        assignedCount++;
        console.log(`   ✓ Assigned ${subject.name} (${subject.code}) to ${teacher.firstName} ${teacher.lastName}`);
      } catch (error) {
        console.log(`   ✗ Error assigning ${subject.name} to ${teacher.firstName} ${teacher.lastName}: ${error.message}`);
      }
    }

    // Step 4: Display final state
    console.log('\n=== FINAL TEACHER-SUBJECT ASSIGNMENTS ===');
    const finalTeachers = await Teacher.find().populate('subjects');
    const finalSubjects = await Subject.find().populate('teacherId');
    
    for (const teacher of finalTeachers) {
      console.log(`${teacher.firstName} ${teacher.lastName} (${teacher.teacherId}): ${teacher.subjects.length} subjects`);
      teacher.subjects.forEach(subject => {
        console.log(`  - ${subject.name} (${subject.code})`);
      });
    }

    // Show unassigned subjects
    const unassignedSubjects = finalSubjects.filter(s => !s.teacherId);
    if (unassignedSubjects.length > 0) {
      console.log(`\n📚 UNASSIGNED SUBJECTS (${unassignedSubjects.length}):`);
      unassignedSubjects.forEach(subject => {
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
    console.log(`Real teachers: ${finalTeachers.length}`);
    console.log(`Subjects assigned: ${assignedCount}`);
    console.log(`Subjects unassigned: ${unassignedSubjects.length}`);
    console.log(`Total subjects: ${finalSubjects.length}`);

  } catch (err) {
    console.error('Error in cleanup:', err);
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

cleanupDummyTeachers(); 