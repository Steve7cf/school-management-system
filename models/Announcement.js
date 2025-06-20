const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    content: {
        type: String,
        required: true,
        trim: true
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'authorModel',
        required: true
    },
    authorModel: {
        type: String,
        required: true,
        enum: ['Teacher', 'Admin']
    },
    targetAudience: [{
        type: String,
        enum: ['All', 'Students', 'Teachers', 'Parents'],
        required: true
    }],
    gradeLevel: {
        type: Number,
        min: 1,
        max: 12
    },
    priority: {
        type: String,
        enum: ['Low', 'Medium', 'High', 'Urgent'],
        default: 'Medium'
    },
    expiryDate: {
        type: Date
    },
    attachments: [{
        name: String,
        url: String,
        type: String
    }],
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Index for efficient queries
announcementSchema.index({ createdAt: -1, targetAudience: 1, gradeLevel: 1 });

// Virtual for checking if announcement is expired
announcementSchema.virtual('isExpired').get(function() {
    if (!this.expiryDate) return false;
    return new Date() > this.expiryDate;
});

// Pre-save middleware to handle empty targetAudience
announcementSchema.pre('save', function(next) {
    if (!this.targetAudience || this.targetAudience.length === 0) {
        this.targetAudience = ['All'];
    }
    next();
});

module.exports = mongoose.model('Announcement', announcementSchema); 