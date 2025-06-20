const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  eventType: { type: String, required: true }, // e.g., 'student_created', 'login', 'password_reset'
  user: { type: String }, // e.g., admin email or userId
  details: { type: Object }, // any relevant details (studentId, password, etc.)
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Log', logSchema); 