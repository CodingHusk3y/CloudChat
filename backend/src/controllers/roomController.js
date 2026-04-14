const ChatRoom = require('../models/ChatRoom');

exports.createRoom = async (req, res) => {
  try {
    const { name, description, members } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Room name is required' });
    }

    const room = await ChatRoom.create({
      name,
      description,
      members: members || [],
    });

    res.status(201).json(room);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAllRooms = async (req, res) => {
  try {
    const rooms = await ChatRoom.find()
      .populate('lastMessage')
      .sort({ updatedAt: -1 });

    res.status(200).json(rooms);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getRoomById = async (req, res) => {
  try {
    const room = await ChatRoom.findById(req.params.roomId).populate('lastMessage');

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    res.status(200).json(room);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.addMemberToRoom = async (req, res) => {
  try {
    const { username } = req.body;

    const room = await ChatRoom.findById(req.params.roomId);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    if (!username) {
      return res.status(400).json({ message: 'Username is required' });
    }

    if (!room.members.includes(username)) {
      room.members.push(username);
      await room.save();
    }

    res.status(200).json(room);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteRoom = async (req, res) => {
  try {
    const room = await ChatRoom.findByIdAndDelete(req.params.roomId);

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    res.status(200).json({ message: 'Room deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
