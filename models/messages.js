const mongoose = require("mongoose");

const messageSchema =  new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    required: true
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Parent',
    required: true
  },
  message: {
    type: String,
    required: true
  },
  read: {
    type: Boolean,
    default: false
  },
  time: {
    type: String,
    required: [true, "time is required"],
    default:Date.now()
  }
}, {timestamps:true});

module.exports = mongoose.model("Message", messageSchema);
