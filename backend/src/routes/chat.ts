import express from "express";
import { callModelAPI } from "../services/modelService";
import { transformMessages } from "../utils/transform";
import { getModelConfig } from "../config/models";
import { logModelUsage } from "../services/metrics";
import { logCall, logError } from "../services/metrics";
import { UsageService } from "../services/usageService";
import { KeyService } from "../services/keyService";
import { logger } from "../utils/logger";

const router = express.Router();

router.get("/models", (req, res) => {
  const allModels = getModelConfig().models;
  const models = allModels.filter((m: any) => m.enabled !== false && m.type !== 'image').map((m: any) => ({
    id: m.id,
    name: m.name,
    contextWindow: m.contextWindow,
    supportsStreaming: m.supportsStreaming,
    creditCost: m.creditCost !== undefined ? Number(m.creditCost) : 1,
  }));
  res.json(models);
});

router.post("/chat/:modelId", async (req, res) => {
  const { modelId } = req.params as any;
  // Get fingerprint
  const fingerprint = req.headers['x-device-fingerprint'] as string;
  if (!fingerprint) {
    return res.status(400).json({ error: "Missing identity headers" });
  }

  // Get IP (respect trust proxy setting)
  const ip = req.ip || req.socket.remoteAddress || "";

  // Get activation key (optional)
  const activationKey = (req.headers['x-activation-key'] as string)?.trim().toUpperCase();

  const cfg = getModelConfig();
  const model = cfg.models.find((m: any) => m.id === modelId);
  if (!model) return res.status(404).json({ error: "模型不存在" });
  if (model.enabled === false) return res.status(403).json({ error: "该模型已禁用" });

  const creditCost = model.creditCost !== undefined ? Number(model.creditCost) : 1;

  // Atomic reserve: increment first, check after (prevents race conditions)
  const { allowed, remaining, role, showWarning } = UsageService.checkLimit(fingerprint, ip, creditCost);

  // Set Usage Headers
  res.setHeader('X-Usage-Remaining', remaining);
  res.setHeader('X-Usage-Role', role);
  if (showWarning) {
    res.setHeader('X-Usage-Warning', 'true');
  }

  // Track which method we use for counting
  let useKeyCredits = false;
  let usageReserved = false;

  if (!allowed) {
    // Daily limit exceeded - check if user has activation key credits
    if (activationKey) {
      const keyBalance = KeyService.getBalance(activationKey);
      if (keyBalance >= creditCost) {
        useKeyCredits = true;
        res.setHeader('X-Key-Balance', keyBalance);
        console.log(`[Chat] Using key credits: ${activationKey.slice(0, 4)}***, balance: ${keyBalance}, cost: ${creditCost}`);
      } else {
        return res.status(429).json({ error: `已达到今日对话上限，您的密钥余额不足以支付该模型所需的额度 (${creditCost})` });
      }
    } else {
      return res.status(429).json({ error: `已达到今日对话上限 (${role === 'restricted' ? 10 : 25}条)` });
    }
  } else {
    // Reserve usage atomically (increment + verify)
    const reserved = UsageService.reserve(fingerprint, creditCost);
    if (!reserved.allowed) {
      return res.status(429).json({ error: `已达到今日对话上限` });
    }
    usageReserved = true;
  }

  // Also set key balance header if key is provided (even if not needed)
  if (activationKey && !useKeyCredits) {
    const keyBalance = KeyService.getBalance(activationKey);
    res.setHeader('X-Key-Balance', keyBalance);
  }

  const { messages, stream = true, webSearch = false } = req.body || {};

  // Validate messages array
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "消息列表不能为空" });
  }
  if (messages.length > 100) {
    return res.status(400).json({ error: "消息列表过长（最多100条）" });
  }

  // Log usage
  logModelUsage(modelId);
  let useModel = model;
  let useApiKey = model.apiKey;

  const allowFallback = (process.env.ALLOW_MODEL_FALLBACK || "false").toLowerCase() === "true";
  if (!useApiKey && allowFallback) {
    const fallback = cfg.models.find((m: any) => m.id === "deepseek-openai-mock");
    if (fallback) {
      useModel = fallback;
      useApiKey = undefined;
    }
  }
  if (!useApiKey && useModel.id !== "deepseek-openai-mock") {
    console.error(`[Chat Error] Missing API Key for model ${model.id}`);
    return res.status(500).json({ error: `系统未配置该模型的 API Key，请联系管理员配置。` });
  }
  const transformed = transformMessages(messages || [], useModel.messageFormat);
  // Create AbortController for client disconnect detection
  const abortController = new AbortController();
  let clientDisconnected = false;
  let chunkCount = 0;

  req.on('close', () => {
    if (!res.writableEnded && !res.headersSent) {
      clientDisconnected = true;
      abortController.abort();
    }
  });

  // Track usage helpers
  let usageIncremented = false;
  const trackUsage = () => {
    if (!usageIncremented) {
      if (useKeyCredits && activationKey) {
        const result = KeyService.useCredit(activationKey, creditCost);
        if (!result.success) {
          console.error(`[Chat] Failed to use key credit: ${result.error}`);
        } else {
          console.log(`[Chat] Deducted ${creditCost} credit(s) from key ${activationKey.slice(0, 4)}***, remaining: ${result.remaining}`);
        }
      } else if (!usageReserved) {
        // Only increment if not already reserved atomically
        UsageService.increment(fingerprint, creditCost);
      }
      usageIncremented = true;
    }
  };

  try {
    if (stream) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no"); // Disable Nginx buffering explicitly
      res.flushHeaders(); // Force send headers immediately

      // Send 4KB padding to bypass proxy/browser verify buffering
      res.write(":" + " ".repeat(4096) + "\n\n");
      (res as any).flush?.();

      // Heartbeat to keep connection alive and prevent proxy buffering
      const heartbeatInterval = setInterval(() => {
        if (!res.writableEnded && !clientDisconnected) {
          res.write(": heartbeat\n\n");
          (res as any).flush?.();
        } else {
          clearInterval(heartbeatInterval);
        }
      }, 15000);

      try {
        await callModelAPI(useModel, transformed, useApiKey, (chunk) => {
          // Skip writing if client already disconnected
          if (clientDisconnected) return;

          // Count usage on first successful chunk
          trackUsage();

          chunkCount++;
          res.write(`data: ${JSON.stringify(chunk)}\n\n`);
          (res as any).flush?.(); // Ensure chunks are sent immediately
        }, abortController.signal, webSearch);

        res.write("data: [DONE]\n\n");
        (res as any).flush?.();
        res.end();
        // Record successful API call
        logCall();
      } finally {
        clearInterval(heartbeatInterval);
      }
    } else {
      const result = await callModelAPI(useModel, transformed, useApiKey, undefined, abortController.signal, webSearch);

      // Count usage on success
      trackUsage();

      res.json(result || { content: "" });
      // Record successful API call
      logCall();
    }
  } catch (e: any) {
    // Record explicit error logs internally
    logger.error(`[Chat Error] modelId: ${req.params.modelId}`, {
      error: e.message,
      stack: e.stack,
      fingerprint,
      modelId: req.params.modelId
    });
    
    logError();
    const m = String(e?.message || "").match(/HTTP (\d{3})/);
    const sc = m ? parseInt(m[1], 10) : 500;

    // Filter basic errors for user UI
    const userMessage = sc === 429 ? "请求过于频繁或额度受限，请稍后再试 (HTTP 429)" :
                        sc === 500 ? "服务内部组件异常，请稍后重试 (HTTP 500)" :
                        [502, 503, 504].includes(sc) ? `上游模型接口可能掉线或超载，请稍后再试 (HTTP ${sc})` :
                        `网络请求或模型响应失败 (HTTP ${sc})`;

    if (res.headersSent) {
      // If headers sent, we must send error as SSE data
      res.write(`data: ${JSON.stringify({ error: userMessage })}\n\n`);
      res.write("data: [DONE]\n\n");
      res.end();
    } else {
      res.status(sc).json({ error: userMessage });
    }
  }
});

export default router;