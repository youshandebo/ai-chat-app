import FingerprintJS from '@fingerprintjs/fingerprintjs';

let fpPromise: Promise<string> | null = null;

export const getFingerprint = async (): Promise<string> => {
    try {
        if (!fpPromise) {
            fpPromise = FingerprintJS.load()
                .then(fp => fp.get())
                .then(result => result.visitorId);
        }
        return await fpPromise;
    } catch (e) {
        console.error("Failed to get fingerprint", e);
        return "unknown-" + Date.now();
    }
};
