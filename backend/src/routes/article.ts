import express from "express";
import { getArticles, getArticle, createArticle, updateArticle, deleteArticle } from "../services/articles";
import { requireAdmin } from "../middleware/auth";

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
router.get("/admin/articles", requireAdmin, (req, res) => {
    try {
        const articles = getArticles(false);  // All articles
        res.json(articles);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

router.post("/admin/articles", requireAdmin, (req, res) => {
    try {
        const { title, content, author, published, tags } = req.body;
        if (!title || !content) {
            return res.status(400).json({ error: "Title and content are required" });
        }

        if (title.length > 100) return res.status(400).json({ error: "Title too long (max 100 chars)" });
        // Content limit handled by JSON parser 2MB limit roughly, but let's add logical check
        if (content.length > 50000) return res.status(400).json({ error: "Content too long (max 50000 chars)" });


        const article = createArticle({
            title,
            content,
            author: author || "youshandebo",
            published: published || false,
            tags: tags || [],
        });
        res.json(article);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

router.put("/admin/articles/:id", requireAdmin, (req, res) => {
    try {
        const allowed: Record<string, any> = {};
        if (req.body.title !== undefined) allowed.title = req.body.title;
        if (req.body.content !== undefined) allowed.content = req.body.content;
        if (req.body.author !== undefined) allowed.author = req.body.author;
        if (req.body.published !== undefined) allowed.published = !!req.body.published;
        if (req.body.tags !== undefined) allowed.tags = req.body.tags;
        const article = updateArticle(req.params.id, allowed);
        if (!article) {
            return res.status(404).json({ error: "Article not found" });
        }
        res.json(article);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

router.delete("/admin/articles/:id", requireAdmin, (req, res) => {
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
