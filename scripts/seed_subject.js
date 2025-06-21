require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Subject = require('../models/Subject');
const Teacher = require('../models/teacher');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/school_management';

const subjectsSeedData = [
    // Grade 1
    { name: 'Mathematics', code: 'MATH1', gradeLevel: 1, credits: 4, description: 'Mathematics for Form 1' },
    { name: 'English', code: 'ENG1', gradeLevel: 1, credits: 4, description: 'English for Form 1' },
    { name: 'Kiswahili', code: 'KISW1', gradeLevel: 1, credits: 3, description: 'Kiswahili for Form 1' },
    { name: 'Biology', code: 'BIO1', gradeLevel: 1, credits: 3, description: 'Biology for Form 1' },
    { name: 'History', code: 'HIST1', gradeLevel: 1, credits: 3, description: 'History for Form 1' },
    { name: 'Civics', code: 'CIV1', gradeLevel: 1, credits: 3, description: 'Civics for Form 1' },
    { name: 'ICT', code: 'ICT1', gradeLevel: 1, credits: 3, description: 'ICT for Form 1' },
    { name: 'Physics', code: 'PHY1', gradeLevel: 1, credits: 3, description: 'Physics for Form 1' },
    { name: 'Chemistry', code: 'CHEM1', gradeLevel: 1, credits: 3, description: 'Chemistry for Form 1' },
    
    // Grade 2
    { name: 'Mathematics', code: 'MATH2', gradeLevel: 2, credits: 4, description: 'Mathematics for Form 2' },
    { name: 'English', code: 'ENG2', gradeLevel: 2, credits: 4, description: 'English for Form 2' },
    { name: 'Kiswahili', code: 'KISW2', gradeLevel: 2, credits: 3, description: 'Kiswahili for Form 2' },
    { name: 'Biology', code: 'BIO2', gradeLevel: 2, credits: 4, description: 'Biology for Form 2' },
    { name: 'Chemistry', code: 'CHEM2', gradeLevel: 2, credits: 4, description: 'Chemistry for Form 2' },
    { name: 'History', code: 'HIST2', gradeLevel: 2, credits: 3, description: 'History for Form 2' },
    { name: 'Civics', code: 'CIV2', gradeLevel: 2, credits: 3, description: 'Civics for Form 2' },
    { name: 'ICT', code: 'ICT2', gradeLevel: 2, credits: 3, description: 'ICT for Form 2' },
    { name: 'Physics', code: 'PHY2', gradeLevel: 2, credits: 3, description: 'Physics for Form 2' },

    // Grade 3
    { name: 'Mathematics', code: 'MATH3', gradeLevel: 3, credits: 4, description: 'Mathematics for Form 3' },
    { name: 'English', code: 'ENG3', gradeLevel: 3, credits: 4, description: 'English for Form 3' },
    { name: 'Kiswahili', code: 'KISW3', gradeLevel: 3, credits: 3, description: 'Kiswahili for Form 3' },
    { name: 'Physics', code: 'PHY3', gradeLevel: 3, credits: 4, description: 'Physics for Form 3' },
    { name: 'History', code: 'HIST3', gradeLevel: 3, credits: 4, description: 'History for Form 3' },
    { name: 'Biology', code: 'BIO3', gradeLevel: 3, credits: 3, description: 'Biology for Form 3' },
    { name: 'Chemistry', code: 'CHEM3', gradeLevel: 3, credits: 3, description: 'Chemistry for Form 3' },
    { name: 'Civics', code: 'CIV3', gradeLevel: 3, credits: 3, description: 'Civics for Form 3' },
    { name: 'ICT', code: 'ICT3', gradeLevel: 3, credits: 3, description: 'ICT for Form 3' },

    // Grade 4
    { name: 'Mathematics', code: 'MATH4', gradeLevel: 4, credits: 4, description: 'Mathematics for Form 4' },
    { name: 'English', code: 'ENG4', gradeLevel: 4, credits: 4, description: 'English for Form 4' },
    { name: 'Kiswahili', code: 'KISW4', gradeLevel: 4, credits: 3, description: 'Kiswahili for Form 4' },
    { name: 'Geography', code: 'GEO4', gradeLevel: 4, credits: 4, description: 'Geography for Form 4' },
    { name: 'Civics', code: 'CIV4', gradeLevel: 4, credits: 4, description: 'Civics for Form 4' },
    { name: 'Biology', code: 'BIO4', gradeLevel: 4, credits: 3, description: 'Biology for Form 4' },
    { name: 'Chemistry', code: 'CHEM4', gradeLevel: 4, credits: 3, description: 'Chemistry for Form 4' },
    { name: 'History', code: 'HIST4', gradeLevel: 4, credits: 3, description: 'History for Form 4' },
    { name: 'ICT', code: 'ICT4', gradeLevel: 4, credits: 3, description: 'ICT for Form 4' },
    { name: 'Physics', code: 'PHY4', gradeLevel: 4, credits: 3, description: 'Physics for Form 4' },
];

async function seedDatabase() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB...');

    // Find or create a teacher
    let teacher = await Teacher.findOne({ email: 'johndoe@example.com' });
    if (!teacher) {
        console.log('Creating a default teacher...');
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('password123', salt);
        teacher = new Teacher({
            firstName: 'John',
            lastName: 'Doe',
            email: 'johndoe@example.com',
            teacherId: 'T001',
            password: hashedPassword,
            role: 'teacher'
        });
        await teacher.save();
        console.log('Default teacher created.');
    }

    console.log('Deleting old subjects...');
    await Subject.deleteMany({});
    
    // Only seed the first 8 subjects
    const subjectsWithTeacher = subjectsSeedData.slice(0, 8).map(s => ({ ...s, teacherId: teacher._id, isActive: true, syllabus: `${s.description} syllabus.` }));
    
    console.log('Seeding new subjects (only 8)...');
    await Subject.insertMany(subjectsWithTeacher);
    
    console.log('Subjects seeded successfully!');

  } catch (err) {
    console.error('Error seeding database:', err);
  } finally {
    console.log('Closing MongoDB connection.');
    mongoose.connection.close();
  }
}

seedDatabase();