require('dotenv').config();
const mongoose = require('mongoose');
const Exam = require('../models/Exam');
const Subject = require('../models/Subject');
const Teacher = require('../models/teacher');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/school_management';

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const forms = [1, 2, 3, 4];
    const sections = ['A', 'B', 'C'];
    const subjects = await Subject.find();
    const teachers = await Teacher.find();
    
    if (!subjects.length || !teachers.length) {
      console.log('Please seed subjects and teachers first.');
      return;
    }

    // Get current date and create future dates for upcoming exams
    const today = new Date();
    const upcomingDates = [
      new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3),  // 3 days from now
      new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7),  // 1 week from now
      new Date(today.getFullYear(), today.getMonth(), today.getDate() + 14), // 2 weeks from now
      new Date(today.getFullYear(), today.getMonth(), today.getDate() + 21), // 3 weeks from now
      new Date(today.getFullYear(), today.getMonth(), today.getDate() + 30), // 1 month from now
    ];

    const examTypes = ['Quiz', 'Mid-Term', 'Term', 'Annual', 'Assignment'];
    const startTimes = ['08:00', '10:00', '14:00', '16:00'];

    let count = 1;
    for (const form of forms) {
      for (const section of sections) {
        for (let i = 0; i < subjects.length; i++) {
          // Create upcoming exams
          for (let j = 0; j < upcomingDates.length; j++) {
            const exam = {
              title: `${subjects[i].name} ${examTypes[j % examTypes.length]}`,
              subject: subjects[i]._id,
              gradeLevel: form,
              date: upcomingDates[j],
              startTime: startTimes[j % startTimes.length],
              duration: 90,
              totalMarks: 100,
              type: examTypes[j % examTypes.length],
              description: `${examTypes[j % examTypes.length]} exam for ${subjects[i].name} in Form ${form}${section}`,
              teacherId: teachers[j % teachers.length]._id,
              status: 'Scheduled'
            };

            const exists = await Exam.findOne({
              subject: exam.subject,
              gradeLevel: exam.gradeLevel,
              date: exam.date,
              title: exam.title
            });

            if (!exists) {
              await Exam.create(exam);
              console.log(`✅ Created: ${exam.title} for Form ${form}${section} on ${exam.date.toLocaleDateString()}`);
            } else {
              console.log(`⏭️  Skipped: ${exam.title} for Form ${form}${section} already exists`);
            }
            count++;
          }
        }
      }
    }

    // Also create some past exams for completeness
    const pastDates = [
      new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7),  // 1 week ago
      new Date(today.getFullYear(), today.getMonth(), today.getDate() - 14), // 2 weeks ago
    ];

    for (const form of forms) {
      for (let i = 0; i < subjects.length; i++) {
        for (let j = 0; j < pastDates.length; j++) {
          const exam = {
            title: `${subjects[i].name} Past ${examTypes[j % examTypes.length]}`,
            subject: subjects[i]._id,
            gradeLevel: form,
            date: pastDates[j],
            startTime: '09:00',
            duration: 90,
            totalMarks: 100,
            type: examTypes[j % examTypes.length],
            description: `Past ${examTypes[j % examTypes.length]} exam for ${subjects[i].name}`,
            teacherId: teachers[0]._id,
            status: 'Completed'
          };

          const exists = await Exam.findOne({
            subject: exam.subject,
            gradeLevel: exam.gradeLevel,
            date: exam.date,
            title: exam.title
          });

          if (!exists) {
            await Exam.create(exam);
            console.log(`✅ Created past exam: ${exam.title} for Form ${form} on ${exam.date.toLocaleDateString()}`);
          }
        }
      }
    }

    // Count total exams
    const totalExams = await Exam.countDocuments();
    const upcomingExams = await Exam.countDocuments({ date: { $gte: new Date() } });
    const pastExams = await Exam.countDocuments({ date: { $lt: new Date() } });

    console.log('\n📊 Exam Summary:');
    console.log(`Total Exams: ${totalExams}`);
    console.log(`Upcoming Exams: ${upcomingExams}`);
    console.log(`Past Exams: ${pastExams}`);

    await mongoose.disconnect();
    console.log('\n🎉 Exam seeding complete!');
  } catch (error) {
    console.error('Error seeding exams:', error);
    await mongoose.disconnect();
  }
}

seed(); 