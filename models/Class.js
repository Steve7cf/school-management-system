const mongoose = require('mongoose');

const classSchema = new mongoose.Schema({
    gradeLevel: {
        type: Number,
        required: true,
        min: 1,
        max: 12
    },
    section: {
        type: String,
        required: true,
        uppercase: true,
        trim: true
    },
    teacherId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Teacher',
        required: false
    },
    studentCount: {
        type: Number,
        default: 0
    },
    academicYear: {
        type: String,
        required: true
    },
    schedule: [{
        day: {
            type: String,
            enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
            required: true
        },
        startTime: {
            type: String,
            required: true
        },
        endTime: {
            type: String,
            required: true
        },
        subject: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Subject',
            required: true
        }
    }],
    students: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student'
    }]
}, {
    timestamps: true
});

// Virtual for class name (e.g., "Form 1-A")
classSchema.virtual('name').get(function() {
    return `Form ${this.gradeLevel}-${this.section}`;
});

// Update student count when students are added or removed
classSchema.pre('save', function(next) {
    if (this.students) {
        this.studentCount = this.students.length;
    }
    next();
});

module.exports = mongoose.model('Class', classSchema); 