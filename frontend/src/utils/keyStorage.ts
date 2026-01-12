const STORAGE_KEY = 'ai_chat_activation_keys';

export function getStoredKeys(): string[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

export function addStoredKey(key: string) {
    const keys = getStoredKeys();
    if (!keys.includes(key)) {
        keys.push(key);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
    }
}

export function removeStoredKey(key: string) {
    let keys = getStoredKeys();
    keys = keys.filter(k => k !== key);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
}
