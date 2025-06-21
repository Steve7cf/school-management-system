const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    gradeLevel: {
        type: Number,
        required: true,
        min: 1,
        max: 12
    },
    teacherId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Teacher',
        required: false
    },
    credits: {
        type: Number,
        required: true,
        min: 1
    },
    syllabus: {
        type: String,
        trim: true
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Indexes for efficient queries
subjectSchema.index({ code: 1, gradeLevel: 1 });
subjectSchema.index({ isActive: 1 }); // Index for active subjects

// Pre-save middleware to validate teacher assignment
subjectSchema.pre('save', async function(next) {
    if (this.teacherId) {
        const Teacher = mongoose.model('Teacher');
        const teacher = await Teacher.findById(this.teacherId);
        if (!teacher) {
            return next(new Error('Assigned teacher does not exist'));
        }
    }
    next();
});

// Static method to get subjects by teacher
subjectSchema.statics.findByTeacher = function(teacherId) {
    return this.find({ teacherId, isActive: true }).populate('teacherId');
};

// Instance method to assign teacher
subjectSchema.methods.assignTeacher = async function(teacherId) {
    const Teacher = mongoose.model('Teacher');
    
    // Remove from old teacher if exists
    if (this.teacherId) {
        await Teacher.findByIdAndUpdate(this.teacherId, {
            $pull: { subjects: this._id }
        });
    }
    
    // Assign to new teacher
    this.teacherId = teacherId;
    if (teacherId) {
        await Teacher.findByIdAndUpdate(teacherId, {
            $addToSet: { subjects: this._id }
        });
    }
    
    return this.save();
};

module.exports = mongoose.model('Subject', subjectSchema); 