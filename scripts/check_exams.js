const mongoose = require('mongoose');
const Exam = require('./models/Exam');
const Subject = require('./models/Subject');

mongoose.connect('mongodb://localhost:27017/school_management')
  .then(async () => {
    console.log('Connected to MongoDB');
    
    // Check if there are any subjects
    const subjects = await Subject.find();
    console.log('Subjects found:', subjects.length);
    if (subjects.length > 0) {
      console.log('First subject:', subjects[0]);
    }
    
    // Check if there are any exams
    const exams = await Exam.find();
    console.log('Exams found:', exams.length);
    if (exams.length > 0) {
      console.log('First exam:', exams[0]);
    }
    
    // Check exams with populated subjects
    const examsWithSubjects = await Exam.find().populate('subject');
    console.log('Exams with subjects:', examsWithSubjects.length);
    if (examsWithSubjects.length > 0) {
      console.log('First exam with subject:', {
        _id: examsWithSubjects[0]._id,
        title: examsWithSubjects[0].title,
        type: examsWithSubjects[0].type,
        subject: examsWithSubjects[0].subject,
        date: examsWithSubjects[0].date
      });
    }
    
    mongoose.connection.close();
  })
  .catch(console.error); 