require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") }); 
const express = require("express");
const http = require("http");        
const { Server } = require("socket.io");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const path = require("path");

const connectDB = require("./config/db");
const { errorHandler, notFound } = require("./middleware/errorHandler");
const { socketHandler, setIO } = require("./sockets/chatSocket");

const authRoutes    = require("./routes/authRoutes");
const groupRoutes   = require("./routes/groupRoutes");
const messageRoutes = require("./routes/messageRoutes");
const roomRoutes    = require("./routes/rooms");

const app = express();
const httpServer = http.createServer(app);


const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

setIO(io);            
socketHandler(io);    

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", "http://localhost:5000", "ws://localhost:5000", "https:", "wss:"],
    },
  },
}));

app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true, 
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,  
  max: 200,                  
  standardHeaders: true,     
  legacyHeaders: false,
  message: { success: false, message: "Too many requests. Please try again later." },
});
app.use("/api", limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: "Too many login attempts. Please try again in 15 minutes." },
});
app.use("/api/auth/login",    authLimiter);
app.use("/api/auth/register", authLimiter);

app.use(express.json({ limit: "1mb" }));                
app.use(express.urlencoded({ extended: true, limit: "1mb" })); 

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev")); 
}

app.use(
  "/uploads",
  (req, res, next) => { res.setHeader("X-Content-Type-Options", "nosniff"); next(); },
  express.static(path.join(__dirname, "..", process.env.UPLOAD_PATH || "uploads"))
);

// Serve frontend static files
app.use(express.static(path.join(__dirname, "../../frontend")));

app.use("/api/auth",   authRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/rooms",  roomRoutes);

app.use("/api/groups/:groupId/messages", messageRoutes);

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
  });
});

app.use(notFound);      
app.use(errorHandler);  

const PORT = process.env.PORT || 5000;

process.on("unhandledRejection", (reason) => {
  console.error("❌ Unhandled promise rejection:", reason);
  process.exit(1);
});

process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught exception:", error);
  process.exit(1);
});

const startServer = async () => {
  await connectDB(); 
  httpServer.on("error", (error) => {
    console.error(`❌ Server failed to listen on port ${PORT}:`, error.message);
    process.exit(1);
  });

  httpServer.listen(PORT, () => {
    console.log(`
🚀 Server running in ${process.env.NODE_ENV || "development"} mode
📡 HTTP:      http://localhost:${PORT}
🔌 WebSocket: ws://localhost:${PORT}
📋 Health:    http://localhost:${PORT}/health
    `);
  });
};

startServer();

module.exports = { app, httpServer };