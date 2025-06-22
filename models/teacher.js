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
    required: false,
    unique: true,
  },
  avatar: {
    type: String,
    default: '/images/teacher_avatar.png'
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
    gradeLevel: String,
    section: String,
  }],
}, {
  timestamps: true
});

// Indexes for efficient queries
teacherSchema.index({ email: 1 });
teacherSchema.index({ subjects: 1 });

// Pre-save middleware to validate subject assignments
teacherSchema.pre('save', async function(next) {
  if (this.subjects && this.subjects.length > 3) {
    return next(new Error('A teacher cannot be assigned more than 3 subjects'));
  }
  
  // Validate that all subjects exist
  if (this.subjects && this.subjects.length > 0) {
    const Subject = mongoose.model('Subject');
    const subjectIds = this.subjects.map(s => s.toString ? s.toString() : s);
    const existingSubjects = await Subject.find({ _id: { $in: subjectIds } });
    if (existingSubjects.length !== this.subjects.length) {
      return next(new Error('One or more assigned subjects do not exist'));
    }
  }
  next();
});

// Static method to get teachers by subject
teacherSchema.statics.findBySubject = function(subjectId) {
  return this.find({ subjects: subjectId }).populate('subjects');
};

// Instance method to add subject
teacherSchema.methods.addSubject = async function(subjectId) {
  const Subject = mongoose.model('Subject');
  
  // Check if teacher already has 3 subjects
  if (this.subjects.length >= 3) {
    throw new Error('Teacher cannot have more than 3 subjects');
  }
  
  // Check if subject exists
  const subject = await Subject.findById(subjectId);
  if (!subject) {
    throw new Error('Subject does not exist');
  }
  
  // Add subject to teacher
  if (!this.subjects.includes(subjectId)) {
    this.subjects.push(subjectId);
    await this.save();
  }
  
  // Update subject's teacherId
  await subject.assignTeacher(this._id);
  
  return this;
};

// Instance method to remove subject
teacherSchema.methods.removeSubject = async function(subjectId) {
  const Subject = mongoose.model('Subject');
  
  // Remove from teacher's subjects
  this.subjects = this.subjects.filter(s => s.toString() !== subjectId.toString());
  await this.save();
  
  // Update subject's teacherId to null
  await Subject.findByIdAndUpdate(subjectId, { teacherId: null });
  
  return this;
};

// Virtual for full name
teacherSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Ensure virtuals are included in JSON
teacherSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model("Teacher", teacherSchema);
