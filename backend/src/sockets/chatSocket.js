const jwt = require("jsonwebtoken");
const User = require("../models/User");

const socketHandler = (io) => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;

      if (!token) {
        return next(new Error("Authentication token missing"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select("username avatar");

      if (!user) return next(new Error("User not found"));

      socket.user = user; 
      next();
    } catch {
      next(new Error("Invalid authentication token"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`🔌 Socket connected: ${socket.user.username} (${socket.id})`);

    User.findByIdAndUpdate(socket.user._id, { isOnline: true }).exec();

    socket.on("join:group", (groupId) => {
      socket.join(groupId);
      socket.to(groupId).emit("user:joined", {
        userId: socket.user._id,
        username: socket.user.username,
        avatar: socket.user.avatar,
      });
      console.log(`👥 ${socket.user.username} joined room ${groupId}`);
    });

    socket.on("leave:group", (groupId) => {
      socket.leave(groupId);
      socket.to(groupId).emit("user:left", {
        userId: socket.user._id,
        username: socket.user.username,
      });
    });

    socket.on("typing:start", (groupId) => {
      socket.to(groupId).emit("typing:start", {
        userId: socket.user._id,
        username: socket.user.username,
      });
    });

    socket.on("typing:stop", (groupId) => {
      socket.to(groupId).emit("typing:stop", {
        userId: socket.user._id,
        username: socket.user.username,
      });
    });

    socket.on("disconnect", () => {
      console.log(`🔌 Socket disconnected: ${socket.user.username}`);

      User.findByIdAndUpdate(socket.user._id, {
        isOnline: false,
        lastSeen: new Date(),
      }).exec();

      io.emit("user:offline", {
        userId: socket.user._id,
        lastSeen: new Date(),
      });
    });
  });
};


let _io; 

const setIO = (io) => { _io = io; };

const emitToGroup = (groupId, event, data) => {
  if (_io) {
    _io.to(groupId.toString()).emit(event, data);
  }
};

module.exports = { socketHandler, setIO, emitToGroup };