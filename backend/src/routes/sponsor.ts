import express from "express";
import { SponsorService } from "../services/sponsorService";
import { requireAdmin } from "../middleware/auth";

const router = express.Router();

// Public: Get all sponsors
router.get("/sponsors", (req, res) => {
    try {
        const sponsors = SponsorService.getAll();
        res.json(sponsors);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// Admin: Create sponsor
router.post("/admin/sponsors", requireAdmin, (req, res) => {
    try {
        const { name, avatar, message, amount } = req.body;
        if (!name || !message) {
            return res.status(400).json({ error: "用户名和留言为必填项" });
        }
        if (name.length > 50) return res.status(400).json({ error: "Name too long (max 50 chars)" });
        if (message.length > 500) return res.status(400).json({ error: "Message too long (max 500 chars)" });

        // 安全检查：验证头像 URL (allow relative paths and http/https only)
        if (avatar && typeof avatar === 'string') {
            const isValid = avatar.startsWith('/') || avatar.startsWith('http://') || avatar.startsWith('https://');
            if (!isValid) {
                return res.status(400).json({ error: "Invalid avatar URL" });
            }
        }

        const sponsor = SponsorService.create({ name, avatar, message, amount });
        res.json(sponsor);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// Admin: Update sponsor
router.put("/admin/sponsors/:id", requireAdmin, (req, res) => {
    try {
        // 安全检查：在更新时验证头像 URL
        if (req.body.avatar && typeof req.body.avatar === 'string') {
            const isValid = req.body.avatar.startsWith('/') || req.body.avatar.startsWith('http://') || req.body.avatar.startsWith('https://');
            if (!isValid) {
                return res.status(400).json({ error: "Invalid avatar URL" });
            }
        }

        const allowed: Record<string, any> = {};
        if (req.body.name !== undefined) allowed.name = req.body.name;
        if (req.body.avatar !== undefined) allowed.avatar = req.body.avatar;
        if (req.body.message !== undefined) allowed.message = req.body.message;
        if (req.body.amount !== undefined) allowed.amount = req.body.amount;
        const updated = SponsorService.update(req.params.id, allowed);
        if (!updated) return res.status(404).json({ error: "Sponsor not found" });
        res.json(updated);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// Admin: Delete sponsor
router.delete("/admin/sponsors/:id", requireAdmin, (req, res) => {
    try {
        const success = SponsorService.delete(req.params.id);
        if (!success) return res.status(404).json({ error: "Sponsor not found" });
        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

export default router;
