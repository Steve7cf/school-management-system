const mongoose = require("mongoose");

const parentSchema =  new mongoose.Schema({
  studentId: {
    type: String,
    required: [true, "student ID is required"],
    unique: true,
    lowercase:true
  },
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
  phone: {
    type: String,
    required: [true, "phone is required"],
  },

  email: {
    type: String,
    required: [true, "email is required"],
    unique: false,
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
    default: "parent",
  },
});

module.exports = mongoose.model("Parent", parentSchema);
