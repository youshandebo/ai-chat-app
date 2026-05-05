import express from "express";
import { SettingsService } from "../services/settingsService";
import { requireAdmin } from "../middleware/auth";

const router = express.Router();

// 获取当前主题 (公开)
router.get("/settings/theme", (req, res) => {
    try {
        const theme = SettingsService.getTheme();
        res.json({ theme });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// 设置主题 (管理员)
router.put("/admin/settings/theme", requireAdmin, (req, res) => {
    try {
        const { theme } = req.body;
        if (!theme) {
            return res.status(400).json({ error: "主题名不能为空" });
        }
        SettingsService.setTheme(theme);
        res.json({ success: true, theme });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// 获取建站时间 (公开)
router.get("/settings/uptime", (req, res) => {
    try {
        const uptimeStart = SettingsService.getUptimeStart();
        res.json({ uptimeStart });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// 设置建站时间 (管理员)
router.put("/admin/settings/uptime", requireAdmin, (req, res) => {
    try {
        const { uptimeStart } = req.body;
        if (!uptimeStart || isNaN(Number(uptimeStart))) {
            return res.status(400).json({ error: "无效的起始时间戳" });
        }
        SettingsService.setUptimeStart(Number(uptimeStart));
        res.json({ success: true, uptimeStart: Number(uptimeStart) });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

export default router;
