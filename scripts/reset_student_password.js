const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Student = require('../models/student');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/school_management')
.then(async () => {
  // Change this to the student you want to reset
  const studentId = 'f1/2025/9084'; // You can change this to another studentId if needed
  const newPassword = '123456';
  const hashed = await bcrypt.hash(newPassword, 10);
  const updated = await Student.findOneAndUpdate(
    { studentId },
    { password: hashed }
  );
  if (updated) {
    console.log(`Password for ${studentId} reset to: ${newPassword}`);
  } else {
    console.log('Student not found');
  }
  mongoose.connection.close();
}); 