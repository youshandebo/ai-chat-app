import express from "express";
import { getMetrics, getSeries, getModelUsage } from "../services/metrics";
import { getModelConfig, saveModels } from "../config/models";
import { loadModels } from "../config/models";

const router = express.Router();

router.post("/reload-models", (req, res) => {
  const auth = (req.get("authorization") || (req.headers["authorization"] as string) || "").trim();
  const token = process.env.ADMIN_TOKEN || "";
  console.log("Admin access attempt:", { auth: auth ? "Bearer ******" : "[EMPTY]", expected: "Bearer ******" });
  if (auth !== `Bearer ${token}`) {
    console.warn("Admin auth failed:", { authPassed: false });
    return res.status(403).json({ error: "无权访问: Token mismatch" });
  }
  try {
    loadModels();
    res.json({ success: true, message: "模型配置已重载" });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Get all models for admin (including disabled ones)
router.get("/models", (req, res) => {
  const auth = (req.get("authorization") || (req.headers["authorization"] as string) || "").trim();
  const token = process.env.ADMIN_TOKEN || "";
  if (auth !== `Bearer ${token}`) return res.status(403).json({ error: "无权访问" });

  try {
    const config = getModelConfig();
    const usage = getModelUsage();

    // Attach usage stats to model list
    const models = config.models.map((m: any) => ({
      ...m,
      usage: usage[m.id] || 0
    }));

    res.json({ models });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Update models (reorder, toggle enabled, update fields)
router.put("/models", (req, res) => {
  const auth = (req.get("authorization") || (req.headers["authorization"] as string) || "").trim();
  const token = process.env.ADMIN_TOKEN || "";
  if (auth !== `Bearer ${token}`) return res.status(403).json({ error: "无权访问" });

  try {
    const { models } = req.body;
    if (!Array.isArray(models)) {
      return res.status(400).json({ error: "models 必须是数组" });
    }
    saveModels(models);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/health", (req, res) => {
  const auth = (req.get("authorization") || (req.headers["authorization"] as string) || "").trim();
  const token = process.env.ADMIN_TOKEN || "";
  console.log("Health check access attempt:", { auth: auth ? "Bearer ******" : "[EMPTY]" });
  if (auth !== `Bearer ${token}`) {
    return res.status(403).json({ error: "无权访问" });
  }
  const cfg = getModelConfig();
  res.json({ ok: true, modelsCount: Array.isArray(cfg?.models) ? cfg.models.length : 0, cors: process.env.CORS_ORIGIN || "" });
});

router.get("/info", (req, res) => {
  const auth = (req.get("authorization") || (req.headers["authorization"] as string) || "").trim();
  const token = process.env.ADMIN_TOKEN || "";
  if (auth !== `Bearer ${token}`) {
    return res.status(403).json({ error: "无权访问" });
  }
  const cfg = getModelConfig();
  const models = (cfg?.models || []).map((m: any) => ({ id: m.id, name: m.name }));
  res.json({ models });
});

router.get("/metrics", (req, res) => {
  const auth = (req.get("authorization") || (req.headers["authorization"] as string) || "").trim();
  const token = process.env.ADMIN_TOKEN || "";

  console.log("[METRICS] Request:", {
    auth: auth ? 'Bearer ***' : '[MISS]',
    range: req.query.range
  });

  if (auth !== `Bearer ${token}`) {
    console.warn("[METRICS] Auth failed");
    return res.status(403).json({ error: "无权访问" });
  }

  try {
    const range = (req.query.range as string) || "24h";
    console.log("[METRICS] Range:", range);
    const m = getMetrics();
    const series = getSeries(range as any);
    console.log("[METRICS] Success, series length:", series.length);
    res.json({ ...m, range, series });
  } catch (error: any) {
    console.error("[METRICS] ERROR:", error.message);
    console.error("[METRICS] Stack:", error.stack);
    res.status(500).json({ error: "Internal Server Error", msg: error.message });
  }
});

export default router;