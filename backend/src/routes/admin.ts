import express from "express";
import { loadModels, getModelConfig } from "../config/models";
import { getMetrics, getSeries } from "../services/metrics";
import { requireAdmin } from "../middleware/auth";

const router = express.Router();

router.use(requireAdmin);

router.post("/reload-models", (req, res) => {
  try {
    loadModels();
    res.json({ success: true, message: "模型配置已重载" });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/health", (req, res) => {
  const cfg = getModelConfig();
  res.json({ ok: true, modelsCount: Array.isArray(cfg?.models) ? cfg.models.length : 0, cors: process.env.CORS_ORIGIN || "" });
});

router.get("/info", (req, res) => {
  const cfg = getModelConfig();
  const models = (cfg?.models || []).map((m: any) => ({ id: m.id, name: m.name }));
  res.json({ models });
});

router.get("/metrics", (req, res) => {
  try {
    const range = (req.query.range as string) || "24h";
    const m = getMetrics();
    const series = getSeries(range as any);
    res.json({ ...m, range, series });
  } catch (error: any) {
    console.error("[METRICS] ERROR:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;