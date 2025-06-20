const mongoose = require('mongoose');
const Subject = require('./models/Subject');
const Teacher = require('./models/teacher');
require('dotenv').config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/school_management';

const subjects = [
  { name: 'Mathematics', code: 'MATH', gradeLevel: 1, credits: 4 },
  { name: 'English', code: 'ENG', gradeLevel: 1, credits: 4 },
  { name: 'Biology', code: 'BIO', gradeLevel: 2, credits: 4 },
  { name: 'Chemistry', code: 'CHEM', gradeLevel: 2, credits: 4 },
  { name: 'Physics', code: 'PHY', gradeLevel: 3, credits: 4 },
  { name: 'History', code: 'HIST', gradeLevel: 3, credits: 4 },
  { name: 'Geography', code: 'GEO', gradeLevel: 4, credits: 4 },
  { name: 'Civics', code: 'CIV', gradeLevel: 4, credits: 4 }
];

async function seedSubjects() {
  try {
    await mongoose.connect(MONGO_URI);
    await Subject.deleteMany({});
    await Subject.insertMany(subjects);
    console.log('Subjects seeded successfully!');
  } catch (err) {
    console.error('Error seeding subjects:', err);
  } finally {
    mongoose.connection.close();
  }
}

async function seed() {
  await mongoose.connect('mongodb://localhost:27017/school_management'); // Change if your DB URI is different

  // Find or create a teacher
  let teacher = await Teacher.findOne();
  if (!teacher) {
    teacher = new Teacher({
      firstName: 'John',
      lastName: 'Doe',
      email: 'johndoe@example.com',
      teacherId: 'T001',
      subject: 'Mathematics',
      password: 'password123',
      role: 'teacher'
    });
    await teacher.save();
  }

  const subjectNames = [
    { name: 'Biology', code: 'BIO' },
    { name: 'History', code: 'HIST' },
    { name: 'Civics', code: 'CIV' },
    { name: 'ICT', code: 'ICT' },
    { name: 'Physics', code: 'PHY' },
    { name: 'Chemistry', code: 'CHEM' },
    { name: 'Kiswahili', code: 'KISW' },
    { name: 'English', code: 'ENG' }
  ];

  for (let gradeLevel = 1; gradeLevel <= 4; gradeLevel++) {
    for (const subj of subjectNames) {
      const exists = await Subject.findOne({ code: subj.code + gradeLevel });
      if (!exists) {
        await Subject.create({
          name: subj.name,
          code: subj.code + gradeLevel,
          description: `${subj.name} for Form ${gradeLevel}`,
          gradeLevel: gradeLevel,
          teacherId: teacher._id,
          credits: 3,
          syllabus: '',
          isActive: true
        });
        console.log(`Subject ${subj.name} for Form ${gradeLevel} created.`);
      } else {
        console.log(`Subject ${subj.name} for Form ${gradeLevel} already exists.`);
      }
    }
  }

  await mongoose.disconnect();
  console.log('Subjects seeding complete.');
}

seedSubjects();
seed(); 