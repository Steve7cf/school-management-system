const mongoose = require("mongoose");

const gradeSchema =  new mongoose.Schema({
  studentId: {
    type: String,
    required: [true, "student ID is required"],
    lowercase: true
  },
  subject: {
    type: String,
    required: [true, "subject is required"],
    unique: false,
  },
  examType: {
    type: String,
    required: [true, "exam type is required"],
    unique: false,
  },
  grade: {
    type: String,
    required: [true, "grade is required"],
    uppercase: true
  },
  marksObtained: {
    type: Number,
    required: [true, "marks obtained is required"],
    min: 0
  },
  totalMarks: {
    type: Number,
    required: [true, "total marks is required"],
    min: 0
  },
  remarks: {
    type: String,
    default: ""
  },
  examId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
    required: true
  },
  studentName: {
    type: String,
    required: true
  },
  examDate: {
    type: Date,
    required: true
  }
}, {timestamps: true});

// Compound index to prevent duplicate results for same student and exam
gradeSchema.index({ studentId: 1, examId: 1 }, { unique: true });

module.exports = mongoose.model("Grade", gradeSchema);
