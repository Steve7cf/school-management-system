const mongoose = require('mongoose');
const Admin = require('../models/admin');
const Teacher = require('../models/teacher');
const Parent = require('../models/parent');
const Student = require('../models/student');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/school_management', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

async function debugStudentsNotLoading() {
    try {
        console.log('🔍 Debugging why students are not loading...\n');

        // Check if students exist in database
        const allStudents = await Student.find({});
        console.log(`📊 Total students in database: ${allStudents.length}`);
        
        if (allStudents.length > 0) {
            console.log('📋 Students found:');
            allStudents.forEach(student => {
                console.log(`   - ${student.firstName} ${student.lastName} (ID: ${student.studentId})`);
            });
        } else {
            console.log('❌ No students found in database');
            return;
        }

        // Test the getAvailableRecipients function for admin
        console.log('\n🧪 Testing getAvailableRecipients for admin:');
        
        const admin = await Admin.findOne();
        if (!admin) {
            console.log('❌ No admin found');
            return;
        }

        console.log(`   Admin: ${admin.firstName} ${admin.lastName}`);

        // Get available recipients for admin
        const recipients = await getAvailableRecipients('admin', admin._id);
        
        console.log(`   Total recipients: ${recipients.length}`);
        
        const studentsInRecipients = recipients.filter(r => r.role === 'student');
        console.log(`   Students in recipients: ${studentsInRecipients.length}`);
        
        if (studentsInRecipients.length > 0) {
            console.log('   Students found in recipients:');
            studentsInRecipients.forEach(student => {
                console.log(`     - ${student.firstName} ${student.lastName} (${student.role})`);
            });
        } else {
            console.log('   ❌ No students in recipients list');
        }

        // Check other user types
        const teachersInRecipients = recipients.filter(r => r.role === 'teacher');
        const parentsInRecipients = recipients.filter(r => r.role === 'parent');
        
        console.log(`   Teachers in recipients: ${teachersInRecipients.length}`);
        console.log(`   Parents in recipients: ${parentsInRecipients.length}`);

    } catch (error) {
        console.error('❌ Error debugging students:', error);
    } finally {
        mongoose.connection.close();
    }
}

// Get available recipients for a user (same as in chatController)
const getAvailableRecipients = async (userRole, userId) => {
  const recipients = [];
  
  switch (userRole) {
    case 'admin':
      // Admin can message teachers, parents, and students
      const teachers = await Teacher.find({}, 'firstName lastName email');
      const parents = await Parent.find({}, 'firstName lastName email');
      const students = await Student.find({}, 'firstName lastName studentId');
      
      console.log(`   Debug: Found ${teachers.length} teachers, ${parents.length} parents, ${students.length} students`);
      
      recipients.push(...teachers.map(t => ({ ...t.toObject(), role: 'teacher' })));
      recipients.push(...parents.map(p => ({ ...p.toObject(), role: 'parent' })));
      recipients.push(...students.map(s => ({ ...s.toObject(), role: 'student' })));
      break;
      
    case 'teacher':
      // Teachers can message admin, parents, and other teachers
      const admin = await Admin.find({}, 'firstName lastName email');
      const otherTeachers = await Teacher.find({ _id: { $ne: userId } }, 'firstName lastName email');
      const teacherParents = await Parent.find({}, 'firstName lastName email');
      
      recipients.push(...admin.map(a => ({ ...a.toObject(), role: 'admin' })));
      recipients.push(...otherTeachers.map(t => ({ ...t.toObject(), role: 'teacher' })));
      recipients.push(...teacherParents.map(p => ({ ...p.toObject(), role: 'parent' })));
      break;
      
    case 'parent':
      // Parents can message admin, teachers, and other parents
      const parentAdmin = await Admin.find({}, 'firstName lastName email');
      const parentTeachers = await Teacher.find({}, 'firstName lastName email');
      const otherParents = await Parent.find({ _id: { $ne: userId } }, 'firstName lastName email');
      
      recipients.push(...parentAdmin.map(a => ({ ...a.toObject(), role: 'admin' })));
      recipients.push(...parentTeachers.map(t => ({ ...t.toObject(), role: 'teacher' })));
      recipients.push(...otherParents.map(p => ({ ...p.toObject(), role: 'parent' })));
      break;
      
    case 'student':
      // Students can message admin, teachers, and their parents
      const studentAdmin = await Admin.find({}, 'firstName lastName email');
      const studentTeachers = await Teacher.find({}, 'firstName lastName email');
      const student = await Student.findById(userId);
      if (student && student.parentEmail) {
        const studentParent = await Parent.findOne({ email: student.parentEmail }, 'firstName lastName email');
        if (studentParent) {
          recipients.push({ ...studentParent.toObject(), role: 'parent' });
        }
      }
      
      recipients.push(...studentAdmin.map(a => ({ ...a.toObject(), role: 'admin' })));
      recipients.push(...studentTeachers.map(t => ({ ...t.toObject(), role: 'teacher' })));
      break;
  }
  
  return recipients;
};

// Run the debug
debugStudentsNotLoading(); 