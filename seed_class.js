const mongoose = require('mongoose');
const Class = require('./models/Class');
const Teacher = require('./models/teacher');

async function seed() {
  await mongoose.connect('mongodb://localhost:27017/school_management'); // Change if your DB URI is different

  // Find a teacher to assign to classes
  let teacher = await Teacher.findOne();
  if (!teacher) {
    console.log('No teacher found. Please seed a teacher first.');
    return;
  }

  // Forms 1-4, Streams A-C
  const classes = [];
  for (let form = 1; form <= 4; form++) {
    for (const section of ['A', 'B', 'C']) {
      classes.push({
        gradeLevel: form,
        section,
        teacherId: teacher._id,
        academicYear: '2023-2024',
        students: [],
        schedule: [],
      });
    }
  }

  for (const classData of classes) {
    // Avoid duplicates
    const exists = await Class.findOne({ gradeLevel: classData.gradeLevel, section: classData.section, academicYear: classData.academicYear });
    if (!exists) {
      await Class.create(classData);
      console.log(`Class Form ${classData.gradeLevel}${classData.section} created.`);
    } else {
      console.log(`Class Form ${classData.gradeLevel}${classData.section} already exists.`);
    }
  }

  await mongoose.disconnect();
  console.log('Class seeding complete.');
}

seed(); 