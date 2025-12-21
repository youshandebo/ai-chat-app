import express from "express";
import { callModelAPI } from "../services/modelService";
import { transformMessages } from "../utils/transform";
import { getModelConfig } from "../config/models";
import { logCall, logError } from "../services/metrics";

const router = express.Router();

router.get("/models", (req, res) => {
  const models = getModelConfig().models.map((m: any) => ({
    id: m.id,
    name: m.name,
    contextWindow: m.contextWindow,
    supportsStreaming: m.supportsStreaming,
  }));
  res.json(models);
});

router.post("/chat/:modelId", async (req, res) => {
  const { modelId } = req.params as any;
  const { messages, stream = true } = req.body || {};
  console.log("/api/chat", { origin: req.headers.origin, ip: req.ip, modelId });
  const cfg = getModelConfig();
  const model = cfg.models.find((m: any) => m.id === modelId);
  if (!model) return res.status(404).json({ error: "模型不存在" });
  let useModel = model;
  let useApiKey = process.env[model.apiKeyEnv];

  // DEBUG LOG
  console.log(`[Chat Debug] Model: ${modelId}, EnvVar: ${model.apiKeyEnv}, KeyPresent: ${!!useApiKey}, Mode: ${stream ? 'stream' : 'unary'}`);

  const allowFallback = (process.env.ALLOW_MODEL_FALLBACK || "false").toLowerCase() === "true";
  if ((!useApiKey && model.apiKeyEnv) && allowFallback) {
    const fallback = cfg.models.find((m: any) => m.id === "deepseek-openai-mock");
    if (fallback) {
      useModel = fallback;
      useApiKey = undefined;
    }
  }
  if (!useApiKey && model.apiKeyEnv && useModel.id === model.id) {
    console.error(`[Chat Error] Missing API Key. EnvVar: ${model.apiKeyEnv}`);
    return res.status(500).json({ error: `Server Configuration Error: Missing API Key for ${model.apiKeyEnv}` });
  }
  const transformed = transformMessages(messages || [], useModel.messageFormat);
  // Create AbortController for client disconnect detection
  const abortController = new AbortController();
  let clientDisconnected = false;

  req.on('close', () => {
    if (!res.writableEnded) {
      clientDisconnected = true;
      console.log(`[Chat] Client disconnected, aborting upstream request for model: ${modelId}`);
      abortController.abort();
    }
  });

  try {
    if (stream) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no"); // Disable Nginx buffering explicitly

      // Send 4KB padding to bypass proxy/browser verify buffering
      res.write(":" + " ".repeat(4096) + "\n\n");
      (res as any).flush?.();

      let chunkCount = 0;
      await callModelAPI(useModel, transformed, useApiKey, (chunk) => {
        // Skip writing if client already disconnected
        if (clientDisconnected) return;
        chunkCount++;
        if (chunkCount % 10 === 0) console.log(`[Chat Stream] Writing chunk ${chunkCount}`);
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
        (res as any).flush?.(); // Ensure chunks are sent immediately
      }, abortController.signal);
      res.write("data: [DONE]\n\n");
      (res as any).flush?.();
      res.write(" ".repeat(1024) + "\n\n"); // Extra padding at the end
      (res as any).flush?.();
      res.end();
      // Record successful API call
      logCall();
    } else {
      const result = await callModelAPI(useModel, transformed, useApiKey, undefined, abortController.signal);
      res.json(result || { content: "" });
      // Record successful API call
      logCall();
    }
  } catch (e: any) {
    // Record error
    console.error(`[Chat Error] modelId: ${req.params.modelId}`, e); // Explicit logging
    logError();
    const m = String(e?.message || "").match(/HTTP (\d{3})/);
    const sc = m ? parseInt(m[1], 10) : 500;

    // Special message for 429 (rate limit / quota exceeded)
    if (sc === 429) {
      return res.status(429).json({
        error: "🚫 Key的额度用完了，请支持下这个网站哦❤️ 访问 /sponsor 页面了解如何支持我们！"
      });
    }

    // If it is 500, try to give more info if dev/admin (or just log it)
    res.status(sc).json({ error: `模型调用失败: ${e.message}` });
  }
});

export default router;