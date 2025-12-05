import express from "express";
import { getArticles, getArticle, createArticle, updateArticle, deleteArticle } from "../services/articles";

const router = express.Router();

// Public routes - get published articles
router.get("/articles", (req, res) => {
    try {
        const articles = getArticles(true);  // Only published
        res.json(articles);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

router.get("/articles/:id", (req, res) => {
    try {
        const article = getArticle(req.params.id);
        if (!article || !article.published) {
            return res.status(404).json({ error: "Article not found" });
        }
        res.json(article);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// Admin routes - require authentication
router.get("/admin/articles", (req, res) => {
    const auth = (req.get("authorization") || "").trim();
    const token = process.env.ADMIN_TOKEN || "";
    if (auth !== `Bearer ${token}`) {
        return res.status(403).json({ error: "无权访问" });
    }

    try {
        const articles = getArticles(false);  // All articles
        res.json(articles);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

router.post("/admin/articles", (req, res) => {
    const auth = (req.get("authorization") || "").trim();
    const token = process.env.ADMIN_TOKEN || "";
    if (auth !== `Bearer ${token}`) {
        return res.status(403).json({ error: "无权访问" });
    }

    try {
        const { title, content, author, published, tags } = req.body;
        if (!title || !content) {
            return res.status(400).json({ error: "Title and content are required" });
        }

        const article = createArticle({
            title,
            content,
            author: author || "Admin",
            published: published || false,
            tags: tags || [],
        });
        res.json(article);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

router.put("/admin/articles/:id", (req, res) => {
    const auth = (req.get("authorization") || "").trim();
    const token = process.env.ADMIN_TOKEN || "";
    if (auth !== `Bearer ${token}`) {
        return res.status(403).json({ error: "无权访问" });
    }

    try {
        const article = updateArticle(req.params.id, req.body);
        if (!article) {
            return res.status(404).json({ error: "Article not found" });
        }
        res.json(article);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

router.delete("/admin/articles/:id", (req, res) => {
    const auth = (req.get("authorization") || "").trim();
    const token = process.env.ADMIN_TOKEN || "";
    if (auth !== `Bearer ${token}`) {
        return res.status(403).json({ error: "无权访问" });
    }

    try {
        const success = deleteArticle(req.params.id);
        if (!success) {
            return res.status(404).json({ error: "Article not found" });
        }
        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

export default router;
