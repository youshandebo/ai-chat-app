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

function ensureLoaded() {
    if (fs.existsSync(dataPath)) {
        try {
            const raw = fs.readFileSync(dataPath, "utf-8");
            const data = JSON.parse(raw);
            // Basic migration/validation check
            if (data.date && (data.fingerprints || data.counters)) {
                if (data.fingerprints) {
                    usage = data;
                } else {
                    // Migrate old format (counters only) -> new format
                    // Treat all old counters as 'normal'
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
        } catch (e) {
            console.error("Failed to parse usages.json", e);
        }
    }

    // Check Date Reset
    const today = new Date().toISOString().split('T')[0];
    if (usage.date !== today) {
        console.log(`[UsageService] Date changed from ${usage.date} to ${today}. Resetting counts.`);
        usage.date = today;
        // Keep roles and history, just reset counts? 
        // Logic: Roles and IP history should persist? 
        // The requirement is "mark secondary user... limit 10". If we reset history, they become new users next day?
        // User said: "Detected multi-user... you are marked". Implies persistence.
        // So we ONLY reset counts.
        for (const fp in usage.fingerprints) {
            usage.fingerprints[fp].count = 0;
        }
        persist();
    }
}

function persist() {
    try {
        writeJsonAtomic(dataPath, usage);
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

    // New User Registration Logic
    if (!fpData) {
        let role: UserRole = 'normal';

        // Check IP History
        const history = usage.ipHistory[ip] || [];
        if (history.length > 0) {
            // This IP has seen other fingerprints -> Suspicious
            // However, confirm it's not the SAME fingerprint (shouldn't be, since !fpData)
            role = 'restricted';
            showWarning = true;
            console.log(`[UsageService] New fingerprint ${fingerprint} on used IP ${ip}. Marking as restricted.`);
        } else {
            // First time seeing this IP (or at least first FP for this IP)
            console.log(`[UsageService] New fingerprint ${fingerprint} on new IP ${ip}. Marking as normal.`);
        }

        fpData = {
            count: 0,
            role,
            firstIp: ip
        };
        usage.fingerprints[fingerprint] = fpData;

        // Update History
        if (!usage.ipHistory[ip]) usage.ipHistory[ip] = [];
        usage.ipHistory[ip].push(fingerprint);

        persist();
    } else {
        // Existing User
        // Check if we need to show warning (maybe simply because they are restricted?)
        // Frontend can handle "only show once", so we can always return true if restricted.
        if (fpData.role === 'restricted') {
            showWarning = true;
        }
        // Update IP history if this FP is moving to a new IP? 
        // Not strictly required for the "Restriction" logic (which is based on creation time), but good for tracking.
        if (!usage.ipHistory[ip]) usage.ipHistory[ip] = [];
        if (!usage.ipHistory[ip].includes(fingerprint)) {
            usage.ipHistory[ip].push(fingerprint);
            persist();
        }
    }

    const max = fpData.role === 'restricted' ? Limits.RESTRICTED : Limits.NORMAL;
    const allowed = fpData.count + amount <= max;

    return {
        allowed,
        remaining: Math.max(0, max - fpData.count),
        role: fpData.role,
        showWarning
    };
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

export function getUsage(fingerprint: string): number {
    ensureLoaded();
    return usage.fingerprints[fingerprint]?.count || 0;
}

export const UsageService = {
    checkLimit,
    increment: incrementUsage,
    get: getUsage
};
