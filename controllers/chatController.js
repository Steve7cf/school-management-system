const Message = require('../models/messages');
const Admin = require('../models/admin');
const Teacher = require('../models/teacher');
const Parent = require('../models/parent');
const Student = require('../models/student');
const { logEvent } = require('../services/logService');

// Get user model based on role
const getUserModel = (role) => {
  switch (role) {
    case 'admin': return Admin;
    case 'teacher': return Teacher;
    case 'parent': return Parent;
    case 'student': return Student;
    default: return null;
  }
};

// Get user model name for refPath
const getUserModelName = (role) => {
  switch (role) {
    case 'admin': return 'Admin';
    case 'teacher': return 'Teacher';
    case 'parent': return 'Parent';
    case 'student': return 'Student';
    default: return null;
  }
};

// Get available recipients for a user
const getAvailableRecipients = async (userRole, userId) => {
  const recipients = [];
  
  switch (userRole) {
    case 'admin':
      // Admin can message teachers, parents, and students
      const teachers = await Teacher.find({}, 'firstName lastName email');
      const parents = await Parent.find({}, 'firstName lastName email');
      const students = await Student.find({}, 'firstName lastName studentId');
      
      recipients.push(...teachers.map(t => ({ ...t.toObject(), role: 'teacher' })));
      recipients.push(...parents.map(p => ({ ...p.toObject(), role: 'parent' })));
      recipients.push(...students.map(s => ({ ...s.toObject(), role: 'student' })));
      break;
      
    case 'teacher':
      // Teachers can message admin, parents, and other teachers
      const admin = await Admin.find({}, 'firstName lastName email');
      const otherTeachers = await Teacher.find({ _id: { $ne: userId } }, 'firstName lastName email');
      const teacherParents = await Parent.find({}, 'firstName lastName email');
      
      recipients.push(...admin.map(a => ({ ...a.toObject(), role: 'admin' })));
      recipients.push(...otherTeachers.map(t => ({ ...t.toObject(), role: 'teacher' })));
      recipients.push(...teacherParents.map(p => ({ ...p.toObject(), role: 'parent' })));
      break;
      
    case 'parent':
      // Parents can message admin, teachers, and other parents
      const parentAdmin = await Admin.find({}, 'firstName lastName email');
      const parentTeachers = await Teacher.find({}, 'firstName lastName email');
      const otherParents = await Parent.find({ _id: { $ne: userId } }, 'firstName lastName email');
      
      recipients.push(...parentAdmin.map(a => ({ ...a.toObject(), role: 'admin' })));
      recipients.push(...parentTeachers.map(t => ({ ...t.toObject(), role: 'teacher' })));
      recipients.push(...otherParents.map(p => ({ ...p.toObject(), role: 'parent' })));
      break;
      
    case 'student':
      // Students can message admin, teachers, and their parents
      const studentAdmin = await Admin.find({}, 'firstName lastName email');
      const studentTeachers = await Teacher.find({}, 'firstName lastName email');
      const student = await Student.findById(userId);
      if (student && student.parentEmail) {
        const studentParent = await Parent.findOne({ email: student.parentEmail }, 'firstName lastName email');
        if (studentParent) {
          recipients.push({ ...studentParent.toObject(), role: 'parent' });
        }
      }
      
      recipients.push(...studentAdmin.map(a => ({ ...a.toObject(), role: 'admin' })));
      recipients.push(...studentTeachers.map(t => ({ ...t.toObject(), role: 'teacher' })));
      break;
  }
  
  return recipients;
};

// Get conversations list
const getConversations = async (req, res) => {
  try {
    const { id, role } = req.session.user;
    
    const conversations = await Message.getConversations(id);
    
    const populatedConversations = await Promise.all(
      conversations.map(async (conv) => {
        const lastMessage = await Message.findById(conv.lastMessage._id)
          .populate('sender', 'firstName lastName email')
          .populate('receiver', 'firstName lastName email');
        
        let otherParticipant, otherParticipantModel;
        if (lastMessage.sender._id.toString() === id) {
          otherParticipant = lastMessage.receiver;
          otherParticipantModel = lastMessage.receiverModel;
        } else {
          otherParticipant = lastMessage.sender;
          otherParticipantModel = lastMessage.senderModel;
        }
        
        // Convert to plain object and add the role
        const otherParticipantObject = otherParticipant.toObject();
        otherParticipantObject.role = otherParticipantModel.toLowerCase();

        return {
          conversationId: conv._id,
          lastMessage: lastMessage,
          unreadCount: conv.unreadCount,
          otherParticipant: otherParticipantObject
        };
      })
    );

    const recipients = await getAvailableRecipients(role, id);
    
    res.render('pages/chat/conversations', {
      title: 'Conversations',
      conversations: populatedConversations,
      recipients: recipients,
      user: req.session.user
    });
  } catch (error) {
    console.error('Error getting conversations:', error);
    req.flash('info', ['Error loading conversations', 'danger']);
    res.redirect('/dashboard');
  }
};

// Get chat conversation
const getChat = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { id, role } = req.session.user;
    
    // Verify user is part of this conversation
    const conversation = await Message.findOne({ 
      conversationId,
      $or: [{ sender: id }, { receiver: id }]
    });
    
    if (!conversation) {
      req.flash('info', ['Conversation not found', 'danger']);
      return res.redirect('/chat');
    }
    
    // Get messages in conversation
    const messages = await Message.getConversationMessages(conversationId);
    
    // If there are no messages, we can't proceed to show the chat.
    // This can happen if a conversation exists but messages were deleted.
    if (!messages || messages.length === 0) {
        req.flash('info', ['This conversation has no messages.', 'info']);
        return res.redirect('/chat');
    }

    // Mark messages as read
    await Message.updateMany(
      { conversationId, receiver: id, read: false },
      { read: true, readAt: new Date() }
    );
    
    // Get other participant details
    const otherParticipantId = messages[0].sender._id.toString() === id 
      ? messages[0].receiver._id 
      : messages[0].sender._id;
    
    const otherParticipantModelName = messages[0].sender._id.toString() === id 
      ? messages[0].receiverModel 
      : messages[0].senderModel;

    const ParticipantModel = getUserModel(otherParticipantModelName.toLowerCase());

    if (!ParticipantModel) {
        req.flash('info', ['Could not identify conversation participant.', 'danger']);
        return res.redirect('/chat');
    }
    
    const otherParticipantDoc = await ParticipantModel.findById(otherParticipantId);

    if (!otherParticipantDoc) {
        req.flash('info', ['Conversation participant not found.', 'danger']);
        return res.redirect('/chat');
    }

    // Convert to plain object and add the role
    const otherParticipant = otherParticipantDoc.toObject();
    otherParticipant.role = otherParticipantModelName.toLowerCase();
    
    res.render('pages/chat/chat', {
      title: 'Chat',
      messages: messages.reverse(), // Show oldest first
      conversationId,
      otherParticipant,
      user: req.session.user
    });
  } catch (error) {
    console.error('Error getting chat:', error);
    req.flash('info', ['Error loading chat', 'danger']);
    res.redirect('/chat');
  }
};

// Get messages for a conversation (JSON API)
const getConversationMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { id } = req.session.user;
    
    // Verify user is part of this conversation
    const conversation = await Message.findOne({ 
      conversationId,
      $or: [{ sender: id }, { receiver: id }]
    });
    
    if (!conversation) {
      return res.status(404).json({ 
        success: false, 
        message: 'Conversation not found' 
      });
    }
    
    // Get messages in conversation
    const messages = await Message.getConversationMessages(conversationId);
    
    // Mark messages as read
    await Message.updateMany(
      { conversationId, receiver: id, read: false },
      { read: true, readAt: new Date() }
    );
    
    res.json({
      success: true,
      messages: messages.reverse() // Show oldest first
    });
  } catch (error) {
    console.error('Error getting conversation messages:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error loading messages' 
    });
  }
};

// Start new conversation
const startConversation = async (req, res) => {
  try {
    const { id, role } = req.session.user;
    const recipients = await getAvailableRecipients(role, id);
    
    res.render('pages/chat/new-conversation', {
      title: 'New Conversation',
      recipients,
      user: req.session.user
    });
  } catch (error) {
    console.error('Error starting conversation:', error);
    req.flash('info', ['Error loading recipients', 'danger']);
    res.redirect('/chat');
  }
};

// Send message
const sendMessage = async (req, res) => {
  try {
    const { id, role } = req.session.user;
    const { receiverId, receiverRole, message, conversationId, replyTo } = req.body;
    
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message cannot be empty' });
    }
    
    // Validate receiver
    const receiverModel = getUserModel(receiverRole);
    if (!receiverModel) {
      return res.status(400).json({ success: false, message: 'Invalid receiver' });
    }
    
    const receiver = await receiverModel.findById(receiverId);
    if (!receiver) {
      return res.status(400).json({ success: false, message: 'Receiver not found' });
    }
    
    // Create new message
    const newMessage = new Message({
      sender: id,
      senderModel: getUserModelName(role),
      receiver: receiverId,
      receiverModel: getUserModelName(receiverRole),
      message: message.trim(),
      conversationId: conversationId || null,
      replyTo: replyTo || null
    });
    
    await newMessage.save();
    
    // Log the message
    await logEvent('message_sent', id, { 
      receiverId, 
      receiverRole, 
      messageLength: message.length 
    });
    
    // Populate sender and receiver for response
    await newMessage.populate('sender', 'firstName lastName');
    await newMessage.populate('receiver', 'firstName lastName');
    
    res.json({ 
      success: true, 
      message: newMessage,
      conversationId: newMessage.conversationId 
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ success: false, message: 'Error sending message' });
  }
};

// Get unread message count
const getUnreadCount = async (req, res) => {
  try {
    const { id } = req.session.user;
    
    const unreadCount = await Message.countDocuments({
      receiver: id,
      read: false
    });
    
    res.json({ unreadCount });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.json({ unreadCount: 0 });
  }
};

// Mark message as read
const markAsRead = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { id } = req.session.user;
    
    const message = await Message.findOne({ _id: messageId, receiver: id });
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }
    
    await message.markAsRead();
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking message as read:', error);
    res.status(500).json({ success: false, message: 'Error marking message as read' });
  }
};

// Delete message (only sender can delete)
const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { id } = req.session.user;
    
    const message = await Message.findOne({ _id: messageId, sender: id });
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }
    
    await Message.findByIdAndDelete(messageId);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ success: false, message: 'Error deleting message' });
  }
};

module.exports = {
  getConversations,
  getChat,
  startConversation,
  sendMessage,
  getUnreadCount,
  markAsRead,
  deleteMessage,
  getAvailableRecipients,
  getConversationMessages
}; 