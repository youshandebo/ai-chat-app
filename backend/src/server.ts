import express from "express";
import cors from "cors";
import path from "path";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import winston from "winston";
import dotenv from "dotenv";
import fs from "fs"; // Fixed: import at top
import chatRouter from "./routes/chat";
import adminRouter from "./routes/admin";
import articleRouter from "./routes/article";
import uploadRouter from "./routes/upload";
import sponsorRouter from "./routes/sponsor";
import { metricsMiddleware } from "./services/metrics";

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || "6555");

// Enhanced logging
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [
    new winston.transports.File({ filename: "backend/logs/error.log", level: "error" }),
    new winston.transports.File({ filename: "backend/logs/combined.log" }),
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

// Serve uploaded files
const uploadsPath = path.join(process.cwd(), 'uploads');
// Check if uploads directory exists, if not create it
if (!fs.existsSync(uploadsPath)) {
  try {
    fs.mkdirSync(uploadsPath, { recursive: true });
  } catch (err) {
    logger.error("Failed to create uploads directory", err);
  }
}
app.use('/api/uploads', express.static(uploadsPath));


// Improved CORS configuration
const corsOrigin = process.env.CORS_ORIGIN || "";
// Security Fix: Do not hardcode localhost origins. Rely solely on env var or default to strict.
// If CORS_ORIGIN is *, run strict check to avoid security issues? No, * means public API.
// If CORS_ORIGIN is not set, we should probably be strict or allow nothing? 
// For this app, let's trust the env var. If empty, it might block everything, which is safer than leaking.
const allowedOrigins = corsOrigin.split(",").map(o => o.trim()).filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      if (corsOrigin === "*" || allowedOrigins.includes(origin)) {
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
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`, {
    origin: req.get('origin') || '[none]',
    auth: req.get('authorization') ? 'Bearer ***' : '[none]',
    query: req.query
  });
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

// Global error handler - must be last
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("=== GLOBAL ERROR HANDLER ===");
  logger.error("Unhandled error", {
    path: req.path,
    method: req.method,
    error: err.message,
    stack: err.stack
  });

  // Security Fix: Do not expose internal error details to client in production
  // We can return a generic message and a correlation ID if we had one.
  res.status(500).json({ error: "Internal Server Error" });
});

app.listen(PORT, () => {
  logger.info(`Server running on http://localhost:${PORT}`);
});