require('dotenv').config();

const http = require('http');
const { Server } = require('socket.io');

const app = require('./app');
const connectDatabase = require('./config/db');
const registerChatSocket = require('./sockets/chatSocket');

const port = process.env.PORT || 3000;

async function startServer() {
  await connectDatabase();

  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || '*'
    }
  });

  registerChatSocket(io);

  server.listen(port, () => {
    console.log(`CloudChat backend listening on port ${port}`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
