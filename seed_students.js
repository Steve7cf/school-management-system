const mongoose = require('mongoose');
const Student = require('./models/student');

async function seed() {
  await mongoose.connect('mongodb://localhost:27017/school_management');

  const sections = ['A', 'B', 'C'];
  const forms = [1, 2, 3, 4];
  let count = 1;
  for (const form of forms) {
    for (const section of sections) {
      for (let i = 1; i <= 5; i++) { // 5 students per class/section
        const studentId = `S${form}${section}${i}`;
        const exists = await Student.findOne({ studentId });
        if (!exists) {
          await Student.create({
            studentId,
            firstName: `First${count}`,
            lastName: `Last${count}`,
            gradeLevel: String(form),
            section,
            dateOfBirth: '2008-01-01',
            parentEmail: `parent${count}@example.com`,
            password: 'password123',
            role: 'student'
          });
          console.log(`Student ${studentId} created.`);
        } else {
          console.log(`Student ${studentId} already exists.`);
        }
        count++;
      }
    }
  }

  await mongoose.disconnect();
  console.log('Student seeding complete.');
}

seed(); 