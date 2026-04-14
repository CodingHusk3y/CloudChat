const Message = require('../models/Message');
const ChatRoom = require('../models/ChatRoom');

exports.createMessage = async (req, res) => {
  try {
    const { roomId, sender, content } = req.body;

    if (!roomId || !sender || !content) {
      return res.status(400).json({
        message: 'roomId, sender, and content are required',
      });
    }

    const room = await ChatRoom.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    const message = await Message.create({
      roomId: room._id,
      sender,
      content,
    });

    room.lastMessage = message._id;
    await room.save();

    const populatedMessage = await Message.findById(message._id).populate('roomId');

    res.status(201).json(populatedMessage);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getMessagesByRoom = async (req, res) => {
  try {
    const { roomId } = req.params;

    const messages = await Message.find({ roomId })
      .sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};