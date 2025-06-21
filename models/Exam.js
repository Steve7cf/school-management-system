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
        required: false
    },
    gradeLevel: {
        type: Number,
        required: false,
        min: 1,
        max: 12
    },
    date: {
        type: Date,
        required: true
    },
    startTime: {
        type: String,
        required: false
    },
    duration: {
        type: Number, // in minutes
        required: false,
        min: 30
    },
    type: {
        type: String,
        enum: ['Term', 'Mid-Term', 'Annual', 'Quiz', 'Assignment'],
        required: true
    },
    description: {
        type: String,
        trim: true
    },
    teacherId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Teacher',
        required: false
    },
    status: {
        type: String,
        enum: ['Scheduled', 'In Progress', 'Completed', 'Cancelled'],
        default: 'Scheduled'
    },
    section: {
        type: String,
        enum: ['A', 'B', 'C'],
        required: false
    },
    targetClasses: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Class'
    }]
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