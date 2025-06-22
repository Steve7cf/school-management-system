const mongoose = require("mongoose");

const studentSchema =  new mongoose.Schema({
  studentId: {
    type: String,
    required: [true, "sudent ID is required"],
    unique: true,
    lowercase:true
  },
  firstName: {
    type: String,
    required: [true, "first name is required"],
    unique: false,
    lowercase:true
  },
  lastName: {
    type: String,
    required: [true, "last name is required"],
    unique: false,
    lowercase:true
  },
  gradeLevel: {
    type: String,
    required: [true, "student level/form/class is required"],
    enum: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"],
  },
  section: {
    type: String,
    required: [true, "section is required"],
    enum: ["A", "B", "C", "D"],
    uppercase: true,
    trim: true
  },
  dateOfBirth: {
    type: String,
    required: [true, "date of birth is required"],
    unique: false,
  },
  parentEmail: {
    type: String,
    required: [true, "parent email is required"],
    unique: false,
    lowercase:true
  },
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
    default: "student",
    lowercase:true
  },
  address: {
    type: String,
    required: false,
    trim: true
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'Male', 'Female'],
    required: false
  },
  guardian: {
    name: {
      type: String,
      required: false,
      trim: true
    },
    relation: {
      type: String,
      enum: ['Father', 'Mother', 'Guardian', ''],
      required: false
    },
    phone: {
      type: String,
      required: false,
      trim: true
    },
    email: {
      type: String,
      required: false,
      lowercase: true,
      trim: true
    }
  },
  subjects: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject'
  }],
});

module.exports = mongoose.model("Student", studentSchema);
