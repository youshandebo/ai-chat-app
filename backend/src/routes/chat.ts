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
  const allowFallback = (process.env.ALLOW_MODEL_FALLBACK || "false").toLowerCase() === "true";
  if ((!useApiKey && model.apiKeyEnv) && allowFallback) {
    const fallback = cfg.models.find((m: any) => m.id === "deepseek-openai-mock");
    if (fallback) {
      useModel = fallback;
      useApiKey = undefined;
    }
  }
  if (!useApiKey && model.apiKeyEnv && useModel.id === model.id) {
    return res.status(500).json({ error: "模型服务未配置" });
  }
  const transformed = transformMessages(messages || [], useModel.messageFormat);
  try {
    if (stream) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      await callModelAPI(useModel, transformed, useApiKey, (chunk) => {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      });
      res.write("data: [DONE]\n\n");
      res.end();
      // Record successful API call
      logCall();
    } else {
      const result = await callModelAPI(useModel, transformed, useApiKey);
      res.json(result || { content: "" });
      // Record successful API call
      logCall();
    }
  } catch (e: any) {
    // Record error
    logError();
    const m = String(e?.message || "").match(/HTTP (\d{3})/);
    const sc = m ? parseInt(m[1], 10) : 500;
    res.status(sc).json({ error: `模型调用失败: ${e.message}` });
  }
});

export default router;