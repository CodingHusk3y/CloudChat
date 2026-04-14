const mongoose = require('mongoose');

const chatRoomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      default: '',
      trim: true
    },
    isGroup: {
      type: Boolean,
      default: true
    },
    members: [
      {
        type: String, // use user IDs if you have auth, or usernames for now
        required: true
      },
    ],
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null
    },
  },
  { timestamps: true }
);
module.exports = mongoose.model('ChatRoom', chatRoomSchema);
