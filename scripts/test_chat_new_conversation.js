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

// Get user model based on role
const getUserModel = (role) => {
  switch (role) {
    case 'admin': return Admin;
    case 'teacher': return Teacher;
    case 'parent': return Parent;
    case 'student': return Student;
    default: return null;
  }
};

// Get available recipients for a user
const getAvailableRecipients = async (userRole, userId) => {
  const recipients = [];
  
  switch (userRole) {
    case 'admin':
      // Admin can message teachers, parents, and students
      const teachers = await Teacher.find({}, 'firstName lastName email');
      const parents = await Parent.find({}, 'firstName lastName email');
      const students = await Student.find({}, 'firstName lastName studentId');
      
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

async function testNewConversation() {
    try {
        console.log('🧪 Testing New Conversation Functionality...\n');

        // Test for each user type
        const userTypes = ['admin', 'teacher', 'parent', 'student'];
        
        for (const userType of userTypes) {
            console.log(`📋 Testing ${userType} recipients:`);
            
            // Get a sample user of this type
            const UserModel = getUserModel(userType);
            if (!UserModel) {
                console.log(`❌ No model found for ${userType}`);
                continue;
            }
            
            const sampleUser = await UserModel.findOne();
            if (!sampleUser) {
                console.log(`❌ No ${userType} found in database`);
                continue;
            }
            
            console.log(`   Sample ${userType}: ${sampleUser.firstName} ${sampleUser.lastName}`);
            
            // Get available recipients
            const recipients = await getAvailableRecipients(userType, sampleUser._id);
            
            console.log(`   Available recipients: ${recipients.length}`);
            recipients.forEach(recipient => {
                console.log(`     - ${recipient.firstName} ${recipient.lastName} (${recipient.role})`);
            });
            
            console.log('');
        }

        console.log('✅ New conversation test completed!');

    } catch (error) {
        console.error('❌ Error testing new conversation:', error);
    } finally {
        mongoose.connection.close();
    }
}

// Run the test
testNewConversation(); 