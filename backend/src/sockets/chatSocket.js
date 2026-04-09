function registerChatSocket(io) {
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
