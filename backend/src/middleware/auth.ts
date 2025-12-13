import express from 'express';

export const requireAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const auth = (req.get("authorization") || "").trim();
    const token = process.env.ADMIN_TOKEN || "";

    if (!token) {
        console.warn("[AUTH] ADMIN_TOKEN not set in environment");
    }

    if (auth !== `Bearer ${token}`) {
        return res.status(403).json({ error: "无权访问" });
    }
    next();
};
