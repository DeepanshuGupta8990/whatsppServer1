const mongoose = require("mongoose");

const messagesSchema = mongoose.Schema({
  username: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  messages: [
    {
      sender: {
        type: String
      },
      receiver: {
        type: String
      },
      type: {
        type: String
      },
      type2: {
        type: String
      },
      text: {
        type: String
      },
      time: {
        type: Date,
        default: Date.now
      },
      uniqueId: {
        type: String
      },
      isDeleted: {
        type: Boolean,
        default: false
      },
      isMezRead: {
        type: Boolean,
        default: false
      },
      isSent: {
        type: Boolean,
        default: false
      },
      isLiked: {
        type: Boolean,
        default: false
      }
    }
  ],
  avatar: {
    type: String
  },
  status: [
    {
      url: {
        type: String,
      },
      time: {
        type: Date,
        default: Date.now
      }
    }
  ]
})

module.exports = mongoose.model('Messages', messagesSchema);