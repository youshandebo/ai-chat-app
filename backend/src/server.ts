import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import winston from "winston";
import dotenv from "dotenv";
import chatRouter from "./routes/chat";
import adminRouter from "./routes/admin";
import { metricsMiddleware } from "./services/metrics";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [
    new winston.transports.File({ filename: "backend/logs/error.log", level: "error" }),
    new winston.transports.File({ filename: "backend/logs/combined.log" }),
    new winston.transports.Console({ format: winston.format.simple() }),
  ],
});

app.use(helmet());
const allowedOrigins = new Set(
  [process.env.CORS_ORIGIN, "http://localhost:5173", "http://127.0.0.1:5173", "http://[::1]:5173"].filter(Boolean) as string[]
);
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.has(origin)) callback(null, true);
      else callback(new Error("CORS not allowed"));
    },
    credentials: true,
  })
);

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


app.listen(PORT, () => {
  logger.info(`Server running on http://localhost:${PORT}`);
});