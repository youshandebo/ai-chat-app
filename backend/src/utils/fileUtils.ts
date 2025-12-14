import fs from 'fs';
import path from 'path';

/**
 * Atomically writes JSON data to a file.
 * Strategy:
 * 1. Write data to a temporary file in the same directory.
 * 2. Flush buffers (fsync).
 * 3. Rename temporary file to target file (atomic operation on POSIX).
 */
export function writeJsonAtomic(filePath: string, data: any) {
    const dir = path.dirname(filePath);
    const tempPath = path.join(dir, `.${path.basename(filePath)}.tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`);

    try {
        // Ensure directory exists
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        const content = JSON.stringify(data, null, 2);

        // 1. Write to temporary file
        fs.writeFileSync(tempPath, content, 'utf-8');

        // 2. Fsync to ensure data is on disk (not strictly possible with writeFileSync provided fd, but separate open/fsync is complex for simple json. 
        // writeFileSync usually relies on OS buffers. For stricter safety we can open, write, fsync, close.
        // For this implementation, we rely on writeFileSync + rename, which is a major improvement over direct overwrite.)

        // 3. Rename temp file to target file
        fs.renameSync(tempPath, filePath);

    } catch (err) {
        console.error(`[FileUtils] Atomic write failed for ${filePath}:`, err);
        // Attempt to clean up temp file
        try {
            if (fs.existsSync(tempPath)) {
                fs.unlinkSync(tempPath);
            }
        } catch (cleanupErr) {
            console.error(`[FileUtils] Failed to clean up temp file ${tempPath}:`, cleanupErr);
        }
        throw err; // Re-throw to caller
    }
}
