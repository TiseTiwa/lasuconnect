// ============================================================
//   LASUConnect — Main Server Entry Point
// ============================================================

require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const mongoSanitize = require("express-mongo-sanitize");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");

const connectDB = require("./config/db");
const { connectCloudinary } = require("./config/cloudinary");
const { initSocket } = require("./socket");
const globalErrorHandler = require("./middleware/errorHandler");
const notFound = require("./middleware/notFound");
const logger = require("./utils/logger");

// ── Routes ────────────────────────────────────────────────
const authRoutes = require("./modules/auth/auth.routes");
const userRoutes = require("./modules/users/users.routes");
const postRoutes = require("./modules/posts/posts.routes");
const reelRoutes = require("./modules/reels/reels.routes");
const messageRoutes = require("./modules/messages/messages.routes");
const courseRoutes = require("./modules/courses/courses.routes");
const announcementRoutes = require("./modules/announcements/announcements.routes");
const tutoringRoutes = require("./modules/tutoring/tutoring.routes");
const liveRoutes = require("./modules/live/live.routes");
const notificationRoutes = require("./modules/notifications/notifications.routes");
const adminRoutes = require("./modules/admin/admin.routes");
const mediaRoutes = require("./modules/media/media.routes");

// ── App + HTTP server ─────────────────────────────────────
const app = express();
const server = http.createServer(app); // ← consistent name throughout

// ── Allowed origins ───────────────────────────────────────
const allowedOrigins = [process.env.CLIENT_URL, "http://localhost:5173"].filter(
  Boolean,
);

// ── CORS (single definition) ──────────────────────────────
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) callback(null, true);
      else callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// ── Socket.IO ─────────────────────────────────────────────
const io = new Server(server, {
  // ← was httpServer, now matches const above
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Attach io to every request so controllers can emit events
app.use((req, res, next) => {
  req.io = io;
  next();
});
initSocket(io);

// ── Database + Cloudinary ─────────────────────────────────
connectDB();
connectCloudinary();

// ── Security middleware ───────────────────────────────────
app.use(helmet());
app.use(mongoSanitize());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

if (process.env.NODE_ENV === "development") app.use(morgan("dev"));

// ── Rate limiters ─────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
});
app.use("/api/", limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message:
      "Too many authentication attempts. Please wait before trying again.",
  },
});
app.use("/api/auth/", authLimiter);

// ── Health check ──────────────────────────────────────────
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "🚀 LASUConnect API is running",
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// ── API Routes ────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/reels", reelRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/announcements", announcementRoutes);
app.use("/api/tutoring", tutoringRoutes);
app.use("/api/live", liveRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/media", mediaRoutes);

// ── Error handlers (must be last) ────────────────────────
app.use(notFound);
app.use(globalErrorHandler);

// ── Start server ──────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  logger.info(`🚀 LASUConnect server running on port ${PORT}`);
  logger.info(`📡 Environment: ${process.env.NODE_ENV}`);
  logger.info(`🌐 API Base:    http://localhost:${PORT}/api`);
  logger.info(`❤️  Health:     http://localhost:${PORT}/health`);
});

// ── Process error handlers ────────────────────────────────
process.on("unhandledRejection", (err) => {
  logger.error(`❌ Unhandled Rejection: ${err.message}`);
  server.close(() => process.exit(1));
});
process.on("uncaughtException", (err) => {
  logger.error(`❌ Uncaught Exception: ${err.message}`);
  process.exit(1);
});

module.exports = { app, server, io };
