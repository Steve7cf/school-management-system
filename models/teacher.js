const mongoose = require("mongoose");

const teacherSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, "first name is required"],
    unique: false,
  },
  lastName: {
    type: String,
    required: [true, "last name is required"],
    unique: false,
  },
  email: {
    type: String,
    required: [true, "email is required"],
    unique: false,
  },
  teacherId: {
    type: String,
    required: true,
    unique: true,
  },
  subjects: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: false
  }],
  password: {
    type: String,
    required: [true, "password is required"],
    unique: false,
    minlength: [6, "weak password detected!"],
  },
  role: {
    type: String,
    required: true,
    enum: ["student", "parent", "teacher"],
    default: "teacher",
  },
  assignedClasses: [{
    gradeLevel: { type: String, required: true },
    section: { type: String, required: true }
  }],
});

module.exports = mongoose.model("Teacher", teacherSchema);
