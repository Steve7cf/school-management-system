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

// Index for efficient queries
subjectSchema.index({ code: 1, gradeLevel: 1 });

module.exports = mongoose.model('Subject', subjectSchema); 