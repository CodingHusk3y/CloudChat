/* function registerChatSocket(io) {
  io.on('connection', (socket) => {
    socket.on('join-room', (roomId) => {
      socket.join(roomId);
    });

    socket.on('send-message', (payload) => {
      io.to(payload.roomId).emit('new-message', payload);
    });
  });
}

module.exports = registerChatSocket;
*/
const Message = require('../models/Message');
const ChatRoom = require('../models/ChatRoom');

const chatSocket = (io) => {
  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on('joinRoom', async ({ roomId, username }) => {
      try {
        socket.join(roomId);
        console.log(`${username} joined room ${roomId}`);

        socket.to(roomId).emit('userJoined', {
          message: `${username} joined the room`,
          username,
          roomId,
        });
      } catch (error) {
        socket.emit('errorMessage', { message: error.message });
      }
    });

    socket.on('leaveRoom', ({ roomId, username }) => {
      socket.leave(roomId);
      socket.to(roomId).emit('userLeft', {
        message: `${username} left the room`,
        username,
        roomId,
      });
    });

    socket.on('sendMessage', async ({ roomId, sender, content }) => {
      try {
        if (!roomId || !sender || !content) {
          return socket.emit('errorMessage', {
            message: 'roomId, sender, and content are required',
          });
        }

        const room = await ChatRoom.findById(roomId);
        if (!room) {
          return socket.emit('errorMessage', {
            message: 'Room not found',
          });
        }

        const message = await Message.create({
          room: roomId,
          sender,
          content,
        });

        room.lastMessage = message._id;
        await room.save();

        const fullMessage = await Message.findById(message._id);

        io.to(roomId).emit('newMessage', fullMessage);
      } catch (error) {
        socket.emit('errorMessage', { message: error.message });
      }
    });

    socket.on('typing', ({ roomId, username }) => {
      socket.to(roomId).emit('typing', {
        username,
      });
    });

    socket.on('stopTyping', ({ roomId, username }) => {
      socket.to(roomId).emit('stopTyping', {
        username,
      });
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.id}`);
    });
  });
};

module.exports = chatSocket;