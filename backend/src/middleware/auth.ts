import express from 'express';
import crypto from 'crypto';
import { validateSession, isSessionToken, getAdminCredential, verifyPassword } from '../services/authService';

export const requireAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const auth = (req.get("authorization") || "").trim();
    const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : '';

    if (!token) {
        return res.status(401).json({ error: "未提供认证令牌" });
    }

    const cred = getAdminCredential();

    if (!cred.value) {
        console.error("[AUTH] ADMIN_TOKEN not set in environment");
        return res.status(500).json({ error: "Server configuration error" });
    }

    // Check if it's a session token (from login endpoint)
    if (isSessionToken(token)) {
        if (validateSession(token)) {
            return next();
        }
        return res.status(401).json({ error: "会话已过期，请重新登录" });
    }

    // Legacy: direct password/token comparison (constant-time)
    if (cred.isHash) {
        // If ADMIN_TOKEN is a hash, we can't compare directly - must use session tokens
        return res.status(401).json({ error: "请通过登录接口认证" });
    }

    // Plain text comparison (legacy mode, constant-time)
    try {
        const authBuffer = Buffer.from(token);
        const expectedBuffer = Buffer.from(cred.value);
        if (authBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(authBuffer, expectedBuffer)) {
            return res.status(403).json({ error: "无权访问" });
        }
    } catch {
        return res.status(403).json({ error: "无权访问" });
    }

    next();
};
