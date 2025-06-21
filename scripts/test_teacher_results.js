const mongoose = require('mongoose');
const Teacher = require('./models/teacher');
const Student = require('./models/student');
const Exam = require('./models/Exam');
const Subject = require('./models/Subject');

mongoose.connect('mongodb://localhost:27017/school_management')
  .then(async () => {
    console.log('Connected to MongoDB');
    
    // Test with a specific teacher (you'll need to replace with actual teacherId)
    const teacherId = 'T001'; // Replace with actual ID
    
    const teacher = await Teacher.findOne({ teacherId }).populate('subjects');
    
    if (!teacher) {
      console.log('Teacher not found');
      return;
    }
    
    console.log('Teacher found:', {
      teacherId: teacher.teacherId,
      name: `${teacher.firstName} ${teacher.lastName}`,
      assignedClasses: teacher.assignedClasses,
      subjects: teacher.subjects ? teacher.subjects.map(s => s.name) : []
    });
    
    // Get students from teacher's assigned classes
    const assignedClasses = teacher.assignedClasses || [];
    let students = [];
    
    if (assignedClasses.length > 0) {
      const orConditions = assignedClasses.map(c => ({
        gradeLevel: c.gradeLevel.toString(),
        section: c.section
      }));
      students = await Student.find({ $or: orConditions }).sort({ firstName: 1, lastName: 1 });
    }
    
    console.log('Students found:', students.length);
    if (students.length > 0) {
      console.log('Sample students:', students.slice(0, 3).map(s => `${s.firstName} ${s.lastName} - Form ${s.gradeLevel} ${s.section}`));
    }
    
    // Get exams for teacher's subjects
    const teacherSubjectIds = teacher.subjects ? teacher.subjects.map(s => s._id) : [];
    let exams = [];
    
    if (teacherSubjectIds.length > 0) {
      exams = await Exam.find({ 
        subject: { $in: teacherSubjectIds },
        teacherId: teacher._id 
      }).populate('subject').sort({ date: -1 });
    }
    
    console.log('Exams found:', exams.length);
    if (exams.length > 0) {
      console.log('Sample exams:', exams.slice(0, 3).map(e => `${e.subject ? e.subject.name : 'No subject'} - ${e.type} (${e.date})`));
    }
    
    mongoose.connection.close();
  })
  .catch(console.error); 