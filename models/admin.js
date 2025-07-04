const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const adminSchema = new Schema({
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    default: 'admin'
  },
  avatar: {
    type: String,
    default: '/images/user.png'
  }
}, { timestamps: true });

module.exports = mongoose.model('Admin', adminSchema);