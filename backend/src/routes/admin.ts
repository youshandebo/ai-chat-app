import express from "express";
import { getMetrics, getSeries, getModelUsage } from "../services/metrics";
import { getModelConfig, saveModels } from "../config/models";
import { loadModels } from "../config/models";
import { requireAdmin } from "../middleware/auth";
import { getAdminCredential, verifyPassword, createSession } from "../services/authService";

const router = express.Router();

// Login endpoint - verifies password server-side and returns session token
router.post("/login", (req, res) => {
  try {
    const { password } = req.body;
    if (!password || typeof password !== 'string') {
      return res.status(400).json({ error: "请提供密码" });
    }

    const cred = getAdminCredential();
    if (!cred.value) {
      return res.status(500).json({ error: "管理员未配置" });
    }

    let valid = false;
    if (cred.isHash) {
      valid = verifyPassword(password, cred.value);
    } else {
      // Legacy plain text comparison (constant-time)
      const crypto = require('crypto');
      try {
        const a = Buffer.from(password);
        const b = Buffer.from(cred.value);
        valid = a.length === b.length && crypto.timingSafeEqual(a, b);
      } catch {
        valid = false;
      }
    }

    if (!valid) {
      return res.status(401).json({ error: "密码错误" });
    }

    const ip = (req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || '').split(',')[0].trim();
    const token = createSession(ip);
    res.json({ success: true, token });
  } catch (e: any) {
    console.error("[Login Error]", e);
    res.status(500).json({ error: "登录失败" });
  }
});

router.post("/reload-models", requireAdmin, (req, res) => {
  try {
    loadModels();
    res.json({ success: true, message: "模型配置已重载" });
  } catch (e: any) {
    console.error("[Admin] reload-models error:", e);
    res.status(500).json({ error: "模型配置重载失败" });
  }
});

// Get all models for admin (including disabled ones)
router.get("/models", requireAdmin, (req, res) => {
  try {
    const config = getModelConfig();
    const usage = getModelUsage();

    // Attach usage stats to model list
    const models = config.models.map((m: any) => {
      const { apiKey, ...rest } = m;
      return { ...rest, usage: usage[m.id] || 0 };
    });

    res.json({ models });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Update models (reorder, toggle enabled, update fields)
router.put("/models", requireAdmin, (req, res) => {
  try {
    const { models } = req.body;
    if (!Array.isArray(models)) {
      return res.status(400).json({ error: "models 必须是数组" });
    }
    
    // Clean up runtime fields before persisting
    const cleanModels = models.map(({ usage, ...rest }) => rest);
    saveModels(cleanModels);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/health", requireAdmin, (req, res) => {
  const cfg = getModelConfig();
  res.json({ ok: true, modelsCount: Array.isArray(cfg?.models) ? cfg.models.length : 0, cors: process.env.CORS_ORIGIN || "" });
});

router.get("/info", requireAdmin, (req, res) => {
  const cfg = getModelConfig();
  const models = (cfg?.models || []).map((m: any) => ({ id: m.id, name: m.name }));
  res.json({ models });
});

router.get("/metrics", requireAdmin, (req, res) => {
  try {
    const range = (req.query.range as string) || "24h";
    console.log("[METRICS] Range:", range);
    const m = getMetrics();
    const series = getSeries(range as any);
    console.log("[METRICS] Success, series length:", series.length);
    res.json({ ...m, range, series });
  } catch (error: any) {
    console.error("[METRICS] ERROR:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;