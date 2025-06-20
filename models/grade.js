const mongoose = require("mongoose");

const gradeSchema =  new mongoose.Schema({
  studentId: {
    type: String,
    required: [true, "student ID is required"],
    lowercase:true
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
    uppercase:true
  }
}, {timestamps:true});

module.exports = mongoose.model("Grade", gradeSchema);
