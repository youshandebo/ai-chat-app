import express from "express";
import { KeyService } from "../services/keyService";
import { requireAdmin } from "../middleware/auth";

const router = express.Router();

// ==================== 管理接口 ====================

// 生成密钥
router.post("/admin/keys/generate", requireAdmin, (req, res) => {
    try {
        const count = parseInt(req.body.count) || 1;
        if (count < 1 || count > 100) {
            return res.status(400).json({ error: "生成数量需在1-100之间" });
        }
        const keys = KeyService.generate(count);
        res.json({ success: true, keys });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// 获取所有密钥
router.get("/admin/keys", requireAdmin, (req, res) => {
    try {
        const keys = KeyService.getAll();
        res.json(keys);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// ==================== 公开接口 ====================

// 激活密钥
router.post("/keys/activate", (req, res) => {
    try {
        const { key } = req.body;
        if (!key || typeof key !== "string") {
            return res.status(400).json({ error: "请提供有效的密钥" });
        }

        const result = KeyService.activate(key.trim().toUpperCase());
        if (result.success) {
            res.json({ success: true, credits: result.credits });
        } else {
            res.status(400).json({ error: result.error });
        }
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// 查询余额
router.post("/keys/balance", (req, res) => {
    try {
        const { key } = req.body;
        const normalizedKey = key?.trim().toUpperCase();
        if (!normalizedKey) {
            return res.status(400).json({ error: "请提供密钥" });
        }
        // Validate key format to prevent enumeration
        if (!/^Y[A-Z0-9]{4}-S[A-Z0-9]{4}-D[A-Z0-9]{4}-B[A-Z0-9]{4}$/.test(normalizedKey)) {
            return res.json({ balance: 0 });
        }
        const balance = KeyService.getBalance(normalizedKey);
        res.json({ balance });
    } catch (e: any) {
        res.status(500).json({ error: "查询失败" });
    }
});

export default router;
