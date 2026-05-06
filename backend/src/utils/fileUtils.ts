import fs from 'fs';
import path from 'path';

/**
 * Atomically writes JSON data to a file.
 * Strategy:
 * 1. Write data to a temporary file in the same directory.
 * 2. Flush buffers (fsync).
 * 3. Rename temporary file to target file (atomic operation on POSIX).
 */
function renameWithRetry(src: string, dest: string, retries = 3, delayMs = 50) {
    for (let i = 0; i < retries; i++) {
        try {
            fs.renameSync(src, dest);
            return;
        } catch (err: any) {
            if ((err.code === 'EBUSY' || err.code === 'EPERM') && i < retries - 1) {
                // Windows file locking: wait and retry
                const wait = delayMs * Math.pow(2, i);
                const end = Date.now() + wait;
                while (Date.now() < end) { /* busy wait */ }
            } else {
                throw err;
            }
        }
    }
}

export function writeJsonAtomic(filePath: string, data: any) {
    const dir = path.dirname(filePath);
    const tempPath = path.join(dir, `.${path.basename(filePath)}.tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`);

    try {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        const content = JSON.stringify(data, null, 2);
        fs.writeFileSync(tempPath, content, 'utf-8');
        renameWithRetry(tempPath, filePath);

    } catch (err) {
        console.error(`[FileUtils] Atomic write failed for ${filePath}:`, err);
        try {
            if (fs.existsSync(tempPath)) {
                fs.unlinkSync(tempPath);
            }
        } catch (cleanupErr) {
            console.error(`[FileUtils] Failed to clean up temp file ${tempPath}:`, cleanupErr);
        }
        throw err;
    }
}
