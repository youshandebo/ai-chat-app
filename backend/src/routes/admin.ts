import express from "express";
import { loadModels, getModelConfig } from "../config/models";
import { getMetrics, getSeries } from "../services/metrics";

const router = express.Router();

router.post("/reload-models", (req, res) => {
  const auth = (req.get("authorization") || (req.headers["authorization"] as string) || "").trim();
  const token = process.env.ADMIN_TOKEN || "";
  console.log("Admin access attempt:", { auth, expected: `Bearer ${token}` }); // 调试日志
  if (auth !== `Bearer ${token}`) {
    return res.status(403).json({ error: "无权访问" });
  }
  try {
    loadModels();
    res.json({ success: true, message: "模型配置已重载" });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/health", (req, res) => {
  const auth = (req.get("authorization") || (req.headers["authorization"] as string) || "").trim();
  const token = process.env.ADMIN_TOKEN || "";
  console.log("Health check access attempt:", { auth, expected: `Bearer ${token}` }); // 调试日志
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
  if (auth !== `Bearer ${token}`) {
    return res.status(403).json({ error: "无权访问" });
  }
  const range = (req.query.range as string) || "24h";
  const m = getMetrics(range as any);
  const series = getSeries(range as any);
  res.json({ ...m, series });
});

export default router;