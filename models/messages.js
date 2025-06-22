const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'senderModel',
    required: true
  },
  senderModel: {
    type: String,
    required: true,
    enum: ['Admin', 'Teacher', 'Parent', 'Student']
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'receiverModel',
    required: true
  },
  receiverModel: {
    type: String,
    required: true,
    enum: ['Admin', 'Teacher', 'Parent', 'Student']
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  read: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date,
    default: null
  },
  conversationId: {
    type: String,
    index: true
  },
  messageType: {
    type: String,
    enum: ['text', 'file', 'image'],
    default: 'text'
  },
  attachments: [{
    filename: String,
    originalName: String,
    path: String,
    size: Number,
    mimeType: String
  }],
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null
  }
}, {
  timestamps: true
});

// Generate conversation ID for easy grouping
messageSchema.pre('save', function(next) {
  if (!this.conversationId) {
    const participants = [this.sender.toString(), this.receiver.toString()].sort();
    this.conversationId = participants.join('_');
  }
  next();
});

// Index for efficient queries
messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ sender: 1, receiver: 1 });
messageSchema.index({ read: 1, receiver: 1 });

// Virtual for sender name
messageSchema.virtual('senderName').get(function() {
  if (this.populated('sender')) {
    return `${this.sender.firstName} ${this.sender.lastName}`;
  }
  return 'Unknown Sender';
});

// Virtual for receiver name
messageSchema.virtual('receiverName').get(function() {
  if (this.populated('receiver')) {
    return `${this.receiver.firstName} ${this.receiver.lastName}`;
  }
  return 'Unknown Receiver';
});

// Static method to get conversations for a user
messageSchema.statics.getConversations = function(userId) {
  const userObjectId = (typeof userId === 'string') ? new mongoose.Types.ObjectId(userId) : userId;
  return this.aggregate([
    {
      $match: {
        $or: [
          { sender: userObjectId },
          { receiver: userObjectId }
        ]
      }
    },
    {
      $group: {
        _id: '$conversationId',
        lastMessage: { $last: '$$ROOT' },
        unreadCount: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ['$receiver', userObjectId] },
                  { $eq: ['$read', false] }
                ]
              },
              1,
              0
            ]
          }
        }
      }
    },
    {
      $sort: { 'lastMessage.createdAt': -1 }
    }
  ]);
};

// Static method to get messages in a conversation
messageSchema.statics.getConversationMessages = function(conversationId, limit = 50, skip = 0) {
  return this.find({ conversationId })
    .populate('sender', 'firstName lastName email')
    .populate('receiver', 'firstName lastName email')
    .populate('replyTo', 'message')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

// Instance method to mark as read
messageSchema.methods.markAsRead = function() {
  this.read = true;
  this.readAt = new Date();
  return this.save();
};

module.exports = mongoose.model("Message", messageSchema);
