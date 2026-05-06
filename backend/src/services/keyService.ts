import fs from "fs";
import path from "path";
import { randomBytes } from "crypto";
import { writeJsonAtomic } from "../utils/fileUtils";

const dataPath = path.resolve(process.cwd(), "data/keys.json");

interface ActivatedKey {
    credits: number;
    activatedAt: number;
}

interface KeysData {
    unused: string[];
    activated: Record<string, ActivatedKey>;
}

let keys: KeysData = {
    unused: [],
    activated: {}
};

const INITIAL_CREDITS = 25;

// TTL cache
let lastLoadTime = 0;
const CACHE_TTL_MS = 5000;

function ensureLoaded() {
    const now = Date.now();
    if (now - lastLoadTime < CACHE_TTL_MS && (keys.unused.length > 0 || Object.keys(keys.activated).length > 0)) {
        return;
    }
    if (fs.existsSync(dataPath)) {
        try {
            const raw = fs.readFileSync(dataPath, "utf-8");
            keys = JSON.parse(raw);
            lastLoadTime = now;
        } catch (e) {
            console.error("Failed to parse keys.json", e);
            keys = { unused: [], activated: {} };
        }
    }
}

function persist() {
    try {
        writeJsonAtomic(dataPath, keys);
    } catch (e) {
        console.error("Failed to persist keys", e);
    }
}

ensureLoaded();

// 生成随机4位字符
function randomSegment(): string {
    return randomBytes(2).toString("hex").toUpperCase();
}

// 生成密钥格式: Yxxxx-Sxxxx-Dxxxx-Bxxxx
function generateKeyString(): string {
    return `Y${randomSegment()}-S${randomSegment()}-D${randomSegment()}-B${randomSegment()}`;
}

// 生成N个密钥
export function generateKeys(count: number): string[] {
    ensureLoaded();
    const newKeys: string[] = [];
    for (let i = 0; i < count; i++) {
        let key = generateKeyString();
        // 确保唯一
        while (keys.unused.includes(key) || keys.activated[key]) {
            key = generateKeyString();
        }
        newKeys.push(key);
        keys.unused.push(key);
    }
    persist();
    console.log(`[KeyService] Generated ${count} keys`);
    return newKeys;
}

// 激活密钥
export function activateKey(key: string): { success: boolean; credits?: number; error?: string } {
    ensureLoaded();

    // 已激活的密钥
    if (keys.activated[key]) {
        return { success: true, credits: keys.activated[key].credits };
    }

    // 未激活的密钥
    const unusedIndex = keys.unused.indexOf(key);
    if (unusedIndex !== -1) {
        keys.unused.splice(unusedIndex, 1);
        keys.activated[key] = {
            credits: INITIAL_CREDITS,
            activatedAt: Date.now()
        };
        persist();
        console.log(`[KeyService] Activated key: ${key}`);
        return { success: true, credits: INITIAL_CREDITS };
    }

    return { success: false, error: "密钥无效或已用尽" };
}

// 使用额度
export function useCredit(key: string, amount: number = 1): { success: boolean; remaining?: number; error?: string } {
    ensureLoaded();

    const activated = keys.activated[key];
    if (!activated) {
        return { success: false, error: "密钥无效或未激活" };
    }

    // 防负数：先检查再扣减
    if (activated.credits < amount) {
        // 如果余额不足且小于amount，返回错误
        return { success: false, error: "密钥余额不足" };
    }

    activated.credits -= amount;
    const remaining = activated.credits;

    // 用尽或小于等于0删除
    if (remaining <= 0) {
        delete keys.activated[key];
        console.log(`[KeyService] Key exhausted and deleted: ${key}`);
    }

    persist();
    return { success: true, remaining };
}

// 查询余额
export function getBalance(key: string): number {
    ensureLoaded();
    return keys.activated[key]?.credits || 0;
}

// 获取所有密钥（管理员）
export function getAllKeys(): { unused: string[]; activated: { key: string; credits: number; activatedAt: number }[] } {
    ensureLoaded();
    return {
        unused: [...keys.unused],
        activated: Object.entries(keys.activated).map(([key, data]) => ({
            key,
            credits: data.credits,
            activatedAt: data.activatedAt
        }))
    };
}

export const KeyService = {
    generate: generateKeys,
    activate: activateKey,
    useCredit,
    getBalance,
    getAll: getAllKeys
};
