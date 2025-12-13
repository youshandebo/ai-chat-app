import express from 'express';
import crypto from 'crypto';

export const requireAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const auth = (req.get("authorization") || "").trim();
    const token = process.env.ADMIN_TOKEN || "";

    if (!token) {
        console.error("[AUTH] ADMIN_TOKEN not set in environment");
        return res.status(500).json({ error: "Server configuration error" });
    }

    const expectedAuth = `Bearer ${token}`;

    // Constant time comparison to prevent timing attacks
    try {
        const authBuffer = Buffer.from(auth);
        const expectedBuffer = Buffer.from(expectedAuth);

        if (authBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(authBuffer, expectedBuffer)) {
            return res.status(403).json({ error: "无权访问" });
        }
    } catch (error) {
        return res.status(403).json({ error: "无权访问" });
    }

    next();
};
