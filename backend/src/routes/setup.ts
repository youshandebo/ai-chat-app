import express from 'express';
import { hashPassword, updateAdminToken } from '../services/authService';

const router = express.Router();

const setupAttempts = new Map<string, { count: number; resetAt: number }>();
const SETUP_RATE_LIMIT = 5;
const SETUP_RATE_WINDOW = 15 * 60 * 1000;

function checkSetupRateLimit(ip: string): boolean {
    const now = Date.now();
    const entry = setupAttempts.get(ip);
    if (!entry || now > entry.resetAt) {
        setupAttempts.set(ip, { count: 1, resetAt: now + SETUP_RATE_WINDOW });
        return true;
    }
    if (entry.count >= SETUP_RATE_LIMIT) return false;
    entry.count++;
    return true;
}

router.get('/setup/status', (req, res) => {
    const token = process.env.ADMIN_TOKEN || '';
    const needsSetup = !token || token === 'your_secure_token_here';
    res.json({ needsSetup });
});

router.post('/setup/init', (req, res) => {
    const currentToken = process.env.ADMIN_TOKEN || '';
    if (currentToken && currentToken !== 'your_secure_token_here') {
        return res.status(403).json({ error: '管理员密码已设置，无法重新初始化' });
    }

    const ip = (req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || '').split(',')[0].trim();
    if (!checkSetupRateLimit(ip)) {
        return res.status(429).json({ error: '尝试次数过多，请15分钟后再试' });
    }

    const { password } = req.body;
    if (!password || typeof password !== 'string' || password.length < 6) {
        return res.status(400).json({ error: '密码至少需要6个字符' });
    }
    if (password.length > 128) {
        return res.status(400).json({ error: '密码过长' });
    }

    try {
        const hashed = hashPassword(password);
        updateAdminToken(hashed);
        res.json({ success: true, message: '管理员密码设置成功！请使用新密码登录管理面板。' });
    } catch (err: any) {
        console.error('[Setup] Failed:', err);
        res.status(500).json({ error: '设置失败' });
    }
});

export default router;
