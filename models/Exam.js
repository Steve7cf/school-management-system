const mongoose = require('mongoose');

const examSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    subject: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject',
        required: true
    },
    gradeLevel: {
        type: Number,
        required: true,
        min: 1,
        max: 12
    },
    date: {
        type: Date,
        required: true
    },
    startTime: {
        type: String,
        required: true
    },
    duration: {
        type: Number, // in minutes
        required: true,
        min: 30
    },
    totalMarks: {
        type: Number,
        required: true,
        min: 0
    },
    type: {
        type: String,
        enum: ['Quiz', 'Mid-Term', 'Final', 'Assignment'],
        required: true
    },
    description: {
        type: String,
        trim: true
    },
    teacherId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Teacher',
        required: true
    },
    status: {
        type: String,
        enum: ['Scheduled', 'In Progress', 'Completed', 'Cancelled'],
        default: 'Scheduled'
    },
    section: {
        type: String,
        enum: ['A', 'B', 'C'],
        required: true
    }
}, {
    timestamps: true
});

// Index for efficient queries
examSchema.index({ date: 1, gradeLevel: 1, subject: 1 });

// Virtual for exam end time
examSchema.virtual('endTime').get(function() {
    const [hours, minutes] = this.startTime.split(':');
    const startDate = new Date();
    startDate.setHours(parseInt(hours), parseInt(minutes));
    startDate.setMinutes(startDate.getMinutes() + this.duration);
    return `${startDate.getHours().toString().padStart(2, '0')}:${startDate.getMinutes().toString().padStart(2, '0')}`;
});

module.exports = mongoose.model('Exam', examSchema); 