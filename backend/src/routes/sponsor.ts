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
        const sponsor = SponsorService.create({ name, avatar, message, amount });
        res.json(sponsor);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// Admin: Update sponsor
router.put("/admin/sponsors/:id", requireAdmin, (req, res) => {
    try {
        const updated = SponsorService.update(req.params.id, req.body);
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
