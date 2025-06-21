require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Student = require('../models/student');
const Parent = require('../models/parent');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/school_management';

const dummyStudent = {
  studentId: 'TESTSTUDENT1',
  firstName: 'Test',
  lastName: 'Student',
  dateOfBirth: new Date('2010-01-01'),
  gender: 'Male',
  class: '1-A',
  parentEmail: 'parent_test@example.com',
  address: '123 Test Lane',
  password: 'student123',
  section: 'A',
  role: 'student',
  gradeLevel: 1,
};

const dummyParent = {
  firstName: 'Test',
  lastName: 'Parent',
  email: 'parent_test@example.com',
  phone: '1234567890',
  password: 'parent123',
  studentId: 'TESTSTUDENT1',
  role: 'parent',
};

async function seedDummyParentAndStudent() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    // Hash passwords
    const studentPasswordHash = await bcrypt.hash(dummyStudent.password, 10);
    const parentPasswordHash = await bcrypt.hash(dummyParent.password, 10);

    // Upsert student
    let student = await Student.findOne({ studentId: dummyStudent.studentId });
    if (!student) {
      student = new Student({
        ...dummyStudent,
        password: studentPasswordHash,
      });
      await student.save();
      console.log('Dummy student created.');
    } else {
      console.log('Dummy student already exists.');
    }

    // Upsert parent
    let parent = await Parent.findOne({ email: dummyParent.email });
    if (!parent) {
      parent = new Parent({
        ...dummyParent,
        password: parentPasswordHash,
      });
      await parent.save();
      console.log('Dummy parent created.');
    } else {
      console.log('Dummy parent already exists.');
    }

    console.log('\nTest credentials:');
    console.log('Parent Email:', dummyParent.email);
    console.log('Parent Password:', dummyParent.password);
    console.log('Student ID:', dummyStudent.studentId);
    console.log('Student Password:', dummyStudent.password);
  } catch (err) {
    console.error('Error seeding dummy parent and student:', err);
  } finally {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

seedDummyParentAndStudent(); 