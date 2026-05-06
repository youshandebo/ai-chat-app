import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const SESSION_TTL = 24 * 60 * 60 * 1000; // 24 hours
const PBKDF2_ITERATIONS = 100000;
const PBKDF2_KEYLEN = 64;
const PBKDF2_DIGEST = 'sha512';

// In-memory session store: token -> { createdAt, ip }
const sessions = new Map<string, { createdAt: number; ip: string }>();

// Clean up expired sessions periodically
setInterval(() => {
    const now = Date.now();
    for (const [token, data] of sessions) {
        if (now - data.createdAt > SESSION_TTL) {
            sessions.delete(token);
        }
    }
}, 60 * 60 * 1000); // every hour

/**
 * Hash a password with PBKDF2 using a random salt.
 * Returns format: salt:hash (both hex-encoded)
 */
export function hashPassword(password: string): string {
    const salt = crypto.randomBytes(32).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, PBKDF2_KEYLEN, PBKDF2_DIGEST).toString('hex');
    return `${salt}:${hash}`;
}

/**
 * Verify a password against a stored hash (format: salt:hash)
 */
export function verifyPassword(password: string, storedHash: string): boolean {
    try {
        const [salt, expectedHash] = storedHash.split(':');
        if (!salt || !expectedHash) return false;
        const hash = crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, PBKDF2_KEYLEN, PBKDF2_DIGEST).toString('hex');
        return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(expectedHash, 'hex'));
    } catch {
        return false;
    }
}

/**
 * Create a session token for a successful login
 */
export function createSession(ip: string): string {
    const token = crypto.randomBytes(32).toString('hex');
    sessions.set(token, { createdAt: Date.now(), ip });
    return token;
}

/**
 * Validate a session token. Returns true if valid, not expired, and IP matches.
 */
export function validateSession(token: string, ip?: string): boolean {
    const session = sessions.get(token);
    if (!session) return false;
    if (Date.now() - session.createdAt > SESSION_TTL) {
        sessions.delete(token);
        return false;
    }
    // Bind session to IP to prevent token theft abuse
    if (ip && session.ip && session.ip !== ip) {
        return false;
    }
    return true;
}

/**
 * Check if a value looks like a session token (64 hex chars)
 * vs a raw password (any other format)
 */
export function isSessionToken(value: string): boolean {
    return /^[a-f0-9]{64}$/.test(value);
}

/**
 * Get the admin credential from .env
 * Supports both plain text (legacy) and PBKDF2 hash format
 */
export function getAdminCredential(): { value: string; isHash: boolean } {
    const raw = process.env.ADMIN_TOKEN || '';
    // Check if it's in hash format (salt:hash)
    if (raw.includes(':') && raw.split(':').length === 2 && raw.split(':')[0].length === 64) {
        return { value: raw, isHash: true };
    }
    return { value: raw, isHash: false };
}

/**
 * Update ADMIN_TOKEN in .env file
 */
export function updateAdminToken(newToken: string): void {
    const envPath = path.resolve(process.cwd(), '.env');
    let envContent = '';
    if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf-8');
    }
    if (envContent.includes('ADMIN_TOKEN=')) {
        envContent = envContent.replace(/ADMIN_TOKEN=.*/g, `ADMIN_TOKEN=${newToken}`);
    } else {
        envContent += `\nADMIN_TOKEN=${newToken}\n`;
    }
    fs.writeFileSync(envPath, envContent, 'utf-8');
    process.env.ADMIN_TOKEN = newToken;
}
