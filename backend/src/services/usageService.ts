import fs from "fs";
import path from "path";
import { writeJsonAtomic } from "../utils/fileUtils";

const dataPath = path.resolve(process.cwd(), "data/usage.json");

type UserRole = 'normal' | 'restricted';

interface FingerprintData {
    count: number;
    role: UserRole;
    firstIp: string;
}

interface UsageData {
    date: string; // YYYY-MM-DD
    fingerprints: Record<string, FingerprintData>;
    ipHistory: Record<string, string[]>; // IP -> List of Fingerprints seen
}

let usage: UsageData = {
    date: new Date().toISOString().split('T')[0],
    fingerprints: {},
    ipHistory: {}
};

// TTL cache: avoid re-reading disk on every API call
let lastLoadTime = 0;
const CACHE_TTL_MS = 5000; // 5 seconds

function ensureLoaded() {
    const now = Date.now();
    if (now - lastLoadTime < CACHE_TTL_MS && Object.keys(usage.fingerprints).length > 0) {
        return; // Cache still fresh
    }

    if (fs.existsSync(dataPath)) {
        try {
            const raw = fs.readFileSync(dataPath, "utf-8");
            const data = JSON.parse(raw);
            if (data.date && (data.fingerprints || data.counters)) {
                if (data.fingerprints) {
                    usage = data;
                } else {
                    usage.date = data.date;
                    usage.fingerprints = {};
                    usage.ipHistory = {};
                    if (data.counters) {
                        for (const [fp, count] of Object.entries(data.counters)) {
                            usage.fingerprints[fp] = { count: count as number, role: 'normal', firstIp: 'unknown' };
                        }
                    }
                }
            }
            lastLoadTime = now;
        } catch (e) {
            console.error("Failed to parse usage.json", e);
        }
    }

    // Check Date Reset
    const today = new Date().toISOString().split('T')[0];
    if (usage.date !== today) {
        console.log(`[UsageService] Date changed from ${usage.date} to ${today}. Resetting counts.`);
        usage.date = today;
        for (const fp in usage.fingerprints) {
            usage.fingerprints[fp].count = 0;
        }
        persist();
    }
}

function persist() {
    try {
        writeJsonAtomic(dataPath, usage);
        lastLoadTime = Date.now(); // Update cache timestamp
    } catch (e) {
        console.error("Failed to persist usage", e);
    }
}

// Initial load
ensureLoaded();

export const Limits = {
    NORMAL: 25,
    RESTRICTED: 10
};

export function checkLimit(fingerprint: string, ip: string, amount: number = 1): { allowed: boolean; remaining: number; role: UserRole; showWarning: boolean } {
    ensureLoaded();

    let fpData = usage.fingerprints[fingerprint];
    let showWarning = false;

    if (!fpData) {
        let role: UserRole = 'normal';
        const history = usage.ipHistory[ip] || [];
        if (history.length > 0) {
            role = 'restricted';
            showWarning = true;
            console.log(`[UsageService] New fingerprint ${fingerprint} on used IP ${ip}. Marking as restricted.`);
        } else {
            console.log(`[UsageService] New fingerprint ${fingerprint} on new IP ${ip}. Marking as normal.`);
        }

        fpData = { count: 0, role, firstIp: ip };
        usage.fingerprints[fingerprint] = fpData;
        if (!usage.ipHistory[ip]) usage.ipHistory[ip] = [];
        usage.ipHistory[ip].push(fingerprint);
        persist();
    } else {
        if (fpData.role === 'restricted') showWarning = true;
        if (!usage.ipHistory[ip]) usage.ipHistory[ip] = [];
        if (!usage.ipHistory[ip].includes(fingerprint)) {
            usage.ipHistory[ip].push(fingerprint);
            persist();
        }
    }

    const max = fpData.role === 'restricted' ? Limits.RESTRICTED : Limits.NORMAL;

    if (amount === 0) {
        return { allowed: true, remaining: Math.max(0, max - fpData.count), role: fpData.role, showWarning };
    }

    const allowed = fpData.count + amount <= max;
    return { allowed, remaining: Math.max(0, max - fpData.count), role: fpData.role, showWarning };
}

/**
 * Atomically reserve usage: increment first, then check if over limit.
 * If over limit, rollback the increment and return false.
 * This prevents race conditions where concurrent requests all pass the limit check.
 */
export function reserveUsage(fingerprint: string, amount: number = 1): { allowed: boolean; remaining: number } {
    ensureLoaded();
    const fpData = usage.fingerprints[fingerprint];
    if (!fpData) return { allowed: false, remaining: 0 };

    const max = fpData.role === 'restricted' ? Limits.RESTRICTED : Limits.NORMAL;

    // Optimistic increment
    fpData.count += amount;

    if (fpData.count > max) {
        // Over limit - rollback
        fpData.count -= amount;
        return { allowed: false, remaining: Math.max(0, max - fpData.count) };
    }

    persist();
    return { allowed: true, remaining: Math.max(0, max - fpData.count) };
}

export function incrementUsage(fingerprint: string, amount: number = 1): number {
    ensureLoaded();
    const fpData = usage.fingerprints[fingerprint];
    if (fpData) {
        fpData.count += amount;
        persist();
        return fpData.count;
    }
    return 0;
}

export function rollbackUsage(fingerprint: string, amount: number = 1): void {
    ensureLoaded();
    const fpData = usage.fingerprints[fingerprint];
    if (fpData) {
        fpData.count = Math.max(0, fpData.count - amount);
        persist();
    }
}

export function getUsage(fingerprint: string): number {
    ensureLoaded();
    return usage.fingerprints[fingerprint]?.count || 0;
}

export const UsageService = {
    checkLimit,
    reserve: reserveUsage,
    increment: incrementUsage,
    rollback: rollbackUsage,
    get: getUsage
};
