const mongoose = require('mongoose');
const Teacher = require('./models/teacher');
const Student = require('./models/student');
const Exam = require('./models/Exam');
const Subject = require('./models/Subject');

mongoose.connect('mongodb://localhost:27017/school_management')
  .then(async () => {
    console.log('Connected to MongoDB');
    
    // Get all teachers
    const teachers = await Teacher.find().populate('subjects');
    console.log('Total teachers:', teachers.length);
    
    teachers.forEach((teacher, index) => {
      console.log(`\nTeacher ${index + 1}:`);
      console.log('- ID:', teacher.teacherId);
      console.log('- Name:', `${teacher.firstName} ${teacher.lastName}`);
      console.log('- Assigned Classes:', teacher.assignedClasses ? teacher.assignedClasses.length : 0);
      console.log('- Subjects:', teacher.subjects ? teacher.subjects.length : 0);
      
      if (teacher.assignedClasses && teacher.assignedClasses.length > 0) {
        console.log('- Class Details:', teacher.assignedClasses);
      }
      
      if (teacher.subjects && teacher.subjects.length > 0) {
        console.log('- Subject Details:', teacher.subjects.map(s => s.name));
      }
    });
    
    // Check if there are any exams
    const exams = await Exam.find().populate('subject');
    console.log('\nTotal exams:', exams.length);
    
    if (exams.length > 0) {
      console.log('Sample exams:');
      exams.slice(0, 3).forEach((exam, index) => {
        console.log(`- Exam ${index + 1}:`, {
          title: exam.title,
          type: exam.type,
          subject: exam.subject ? exam.subject.name : 'No subject',
          teacherId: exam.teacherId,
          date: exam.date
        });
      });
    }
    
    mongoose.connection.close();
  })
  .catch(console.error); 