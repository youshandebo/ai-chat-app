import express from "express";
import cors from "cors";
import path from "path";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import compression from "compression";
import winston from "winston";
import dotenv from "dotenv";
import fs from "fs";
import chatRouter from "./routes/chat";
import adminRouter from "./routes/admin";
import articleRouter from "./routes/article";
import uploadRouter from "./routes/upload";
import sponsorRouter from "./routes/sponsor";
import rssRouter from "./routes/rss";
import voteRouter from "./routes/vote";
import { metricsMiddleware } from "./services/metrics";

dotenv.config();

// Ensure logs directory exists BEFORE creating logger to prevent crash
const rootDir = path.resolve(__dirname, '..'); // dist/.. -> backend root
const logsDir = path.join(rootDir, 'logs');

if (!fs.existsSync(logsDir)) {
  try {
    fs.mkdirSync(logsDir, { recursive: true });
    console.log(`[Startup] Created logs directory at: ${logsDir}`);
  } catch (e) {
    console.error("[Startup] Failed to create logs directory. Logger might fail.", e);
  }
}

const app = express();
const PORT = parseInt(process.env.PORT || "6555");

// Enhanced logging
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [
    new winston.transports.File({ filename: path.join(logsDir, "error.log"), level: "error" }),
    new winston.transports.File({ filename: path.join(logsDir, "combined.log") }),
    new winston.transports.Console({ format: winston.format.simple() }),
  ],
});

// Log startup config (masked)
logger.info(`Server starting with config:`, {
  PORT,
  ADMIN_TOKEN: process.env.ADMIN_TOKEN ? "******" : "[NOT SET]",
  CORS_ORIGIN: process.env.CORS_ORIGIN || "[NOT SET]"
});

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Enable Gzip/Brotli compression
// Enable Gzip/Brotli compression, but EXCLUDE SSE
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    // Strongly disable for chat API to prevent buffering
    if (req.path.includes('/api/chat') || req.path.includes('/chat')) {
      return false;
    }
    if (res.getHeader('Content-Type') === 'text/event-stream') {
      return false;
    }
    return compression.filter(req, res);
  }
}));

// Serve uploaded files
const uploadsPath = path.join(rootDir, 'uploads');
// Check if uploads directory exists, if not create it
if (!fs.existsSync(uploadsPath)) {
  try {
    fs.mkdirSync(uploadsPath, { recursive: true });
    logger.info(`Created uploads directory at: ${uploadsPath}`);
  } catch (err) {
    logger.error("Failed to create uploads directory", err);
  }
}
app.use('/api/uploads', express.static(uploadsPath));


// Improved CORS configuration
// Use strict environment variable control
const corsOrigin = process.env.CORS_ORIGIN || "*";
const allowedOrigins = corsOrigin.split(",").map(o => o.trim()).filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      // If CORS_ORIGIN is * or not set, be permissive for compatibility (or restrict if security demands)
      // For this user app, defaulting to allowing localhost dev ports if env is empty is safer for dev
      const devOrigins = ["http://localhost:5173", "http://localhost:6556"];

      const isAllowed =
        corsOrigin === "*"
        || allowedOrigins.includes(origin)
        || devOrigins.includes(origin); // Fallback for dev ease-of-use

      if (isAllowed) {
        callback(null, true);
      } else {
        logger.warn(`CORS blocked origin: ${origin}`);
        callback(new Error("CORS not allowed"));
      }
    },
    credentials: true,
  })
);

// Debug middleware - log all incoming requests
app.use((req, res, next) => {
  // Simple console log for immediate feedback
  // console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_PER_MINUTE || "60"),
  message: { error: "请求过于频繁，请稍后再试" },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", limiter);

app.use(express.json({ limit: "2mb" }));

app.use("/api", metricsMiddleware);

app.use("/api", chatRouter);
app.use("/api/admin", adminRouter);
app.use("/api", articleRouter);
app.use("/api/admin", uploadRouter);
app.use("/api", sponsorRouter);
app.use("/api", rssRouter);
app.use("/api", voteRouter);

// Global error handler - must be last
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error("Unhandled error", {
    path: req.path,
    method: req.method,
    error: err.message,
    stack: err.stack
  });

  // Security Fix: Do not expose internal error details to client in production
  res.status(500).json({ error: "Internal Server Error" });
});

// Catch uncaught exceptions to prevent silent crash
process.on('uncaughtException', (err) => {
  console.error("UNCAUGHT EXCEPTION:", err);
  if (logger) logger.error("UNCAUGHT EXCEPTION", err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error("UNHANDLED REJECTION:", reason);
  if (logger) logger.error("UNHANDLED REJECTION", { reason });
});

app.listen(PORT, "0.0.0.0", () => {
  logger.info(`Server running on http://0.0.0.0:${PORT}`);
  console.log(`Server started on port ${PORT}`);
});