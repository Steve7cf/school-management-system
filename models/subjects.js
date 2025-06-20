const mongoose = require("mongoose");

const subjectSchema =  new mongoose.Schema({
  subject: {
    type: String,
    required: [true, "subject is required"],
    unique: true,
  },
  subjectTeacher: {
    type: String,
    required: [true, "subject teacher is required"],
    unique: false,
  }
});

module.exports = mongoose.model("Subjects", subjectSchema);
