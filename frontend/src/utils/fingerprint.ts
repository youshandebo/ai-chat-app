import FingerprintJS from '@fingerprintjs/fingerprintjs';

let cachedId: string | null = null;
let fpPromise: Promise<string> | null = null;

// Generate simple UUID fallback
const generateUUID = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
});

export const getFingerprint = async (): Promise<string> => {
    try {
        if (cachedId) return cachedId;

        // 1. Check LocalStorage & SessionStorage
        let storedId = localStorage.getItem('device_fp') || sessionStorage.getItem('device_fp');
        
        // 2. Generate if missing
        if (!storedId) {
            if (!fpPromise) {
                fpPromise = FingerprintJS.load()
                    .then(fp => fp.get())
                    .then(result => `${result.visitorId}-${generateUUID().split('-')[0]}`);
            }
            storedId = await fpPromise;
            // Write it to storages for persistence
            localStorage.setItem('device_fp', storedId!);
            sessionStorage.setItem('device_fp', storedId!);
        }
        
        cachedId = storedId;
        return storedId!;
    } catch (e) {
        console.error("Failed to get fingerprint", e);
        const fb = "unknown-" + crypto.randomUUID();
        localStorage.setItem('device_fp', fb);
        return fb;
    }
};
