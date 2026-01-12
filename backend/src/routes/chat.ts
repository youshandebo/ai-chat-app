import express from "express";
import { callModelAPI } from "../services/modelService";
import { transformMessages } from "../utils/transform";
import { getModelConfig } from "../config/models";
import { logModelUsage } from "../services/metrics";
import { logCall, logError } from "../services/metrics";

const router = express.Router();

router.get("/models", (req, res) => {
  const allModels = getModelConfig().models;
  const models = allModels.filter((m: any) => m.enabled !== false).map((m: any) => ({
    id: m.id,
    name: m.name,
    contextWindow: m.contextWindow,
    supportsStreaming: m.supportsStreaming,
    creditCost: m.creditCost || 1,
  }));
  res.json(models);
});

import { UsageService } from "../services/usageService";
import { KeyService } from "../services/keyService";

// ... existing imports

router.post("/chat/:modelId", async (req, res) => {
  const { modelId } = req.params as any;
  // Get fingerprint
  const fingerprint = req.headers['x-device-fingerprint'] as string;
  if (!fingerprint) {
    return res.status(400).json({ error: "Missing identity headers" });
  }

  // Get IP (Handle proxy)
  const ip = (req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || "").split(',')[0].trim();

  // Get activation key (optional)
  const activationKey = (req.headers['x-activation-key'] as string)?.trim().toUpperCase();

  const cfg = getModelConfig();
  const model = cfg.models.find((m: any) => m.id === modelId);
  if (!model) return res.status(404).json({ error: "模型不存在" });
  if (model.enabled === false) return res.status(403).json({ error: "该模型已禁用" });

  const creditCost = model.creditCost || 1;

  // Check Limit
  const { allowed, remaining, role, showWarning } = UsageService.checkLimit(fingerprint, ip, creditCost);

  // Set Usage Headers
  res.setHeader('X-Usage-Remaining', remaining);
  res.setHeader('X-Usage-Role', role);
  if (showWarning) {
    res.setHeader('X-Usage-Warning', 'true');
  }

  // Track which method we use for counting
  let useKeyCredits = false;

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
  }

  // Also set key balance header if key is provided (even if not needed)
  if (activationKey && !useKeyCredits) {
    const keyBalance = KeyService.getBalance(activationKey);
    res.setHeader('X-Key-Balance', keyBalance);
  }

  const { messages, stream = true, webSearch = false } = req.body || {};
  console.log("/api/chat", { origin: req.headers.origin, ip: ip ? "***" : "[EMPTY]", modelId, webSearch, fingerprint: fingerprint ? "***" : "[EMPTY]", remaining, role });

  // Log usage
  logModelUsage(modelId);
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
  // Allow bypassing missing key if it is a priority model handled in modelService
  const isPriorityModel = modelId === 'gemini-2.5-flash' || modelId === 'gemini-2.5-flash-sf';

  if (!useApiKey && model.apiKeyEnv && useModel.id === model.id && !isPriorityModel) {
    console.error(`[Chat Error] Missing API Key. EnvVar: ${model.apiKeyEnv}`);
    return res.status(500).json({ error: `Server Configuration Error: Missing API Key for ${model.apiKeyEnv}` });
  }
  const transformed = transformMessages(messages || [], useModel.messageFormat);
  // Create AbortController for client disconnect detection
  const abortController = new AbortController();
  let clientDisconnected = false;
  let chunkCount = 0;

  req.on('close', () => {
    if (!res.writableEnded && !res.headersSent) {
      clientDisconnected = true;
      console.log(`[Chat] ⚠️ 客户端在发送任何数据前断开连接，模型: ${modelId}`);
      abortController.abort();
    } else if (!res.writableEnded && res.headersSent) {
      console.log(`[Chat] ⚠️ 客户端在流式传输中断开连接，已发送 ${chunkCount} 个数据包`);
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
      } else {
        UsageService.increment(fingerprint, creditCost);
      }
      usageIncremented = true;
    }
  };

  try {
    if (stream) {
      console.log(`[Chat Stream] 开始流式响应处理，模型: ${modelId}`);
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no"); // Disable Nginx buffering explicitly

      // Send 4KB padding to bypass proxy/browser verify buffering
      console.log(`[Chat Stream] 发送4KB填充数据...`);
      res.write(":" + " ".repeat(4096) + "\n\n");
      (res as any).flush?.();

      console.log(`[Chat Stream] 调用 callModelAPI，useModel ID: ${useModel.id}，useApiKey: ${useApiKey ? '已设置' : '未设置'}`);
      await callModelAPI(useModel, transformed, useApiKey, (chunk) => {
        // Skip writing if client already disconnected
        if (clientDisconnected) {
          console.log(`[Chat Stream] 客户端已断开连接，跳过写入`);
          return;
        }

        // Count usage on first successful chunk
        trackUsage();

        chunkCount++;
        console.log(`[Chat Stream] ✅ 回调接收到数据包 #${chunkCount}: content="${chunk.content?.slice(0, 50)}", done=${chunk.done}`);
        const dataStr = `data: ${JSON.stringify(chunk)}\n\n`;
        console.log(`[Chat Stream] 写入SSE数据: ${dataStr.slice(0, 100)}`);
        res.write(dataStr);
        (res as any).flush?.(); // Ensure chunks are sent immediately
      }, abortController.signal, webSearch);

      console.log(`[Chat Stream] callModelAPI 完成，共接收到 ${chunkCount} 个数据包`);
      console.log(`[Chat Stream] 发送[DONE]信号...`);
      res.write("data: [DONE]\n\n");
      (res as any).flush?.();
      res.write(" ".repeat(1024) + "\n\n"); // Extra padding at the end
      (res as any).flush?.();
      res.end();
      console.log(`[Chat Stream] 流式响应结束`);
      // Record successful API call
      logCall();
    } else {
      const result = await callModelAPI(useModel, transformed, useApiKey, undefined, abortController.signal, webSearch);

      // Count usage on success
      trackUsage();

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

    if (res.headersSent) {
      // If headers sent, we must send error as SSE data
      res.write(`data: ${JSON.stringify({ error: `模型调用失败: ${e.message}` })}\n\n`);
      res.write("data: [DONE]\n\n");
      res.end();
    } else {
      res.status(sc).json({ error: `模型调用失败: ${e.message}` });
    }
  }
});

export default router;