const fs = require('fs');
const path = require('path');
const http = require('http');

console.log('=== Backend Diagnostics Tool ===');
console.log('Node Version:', process.version);
console.log('CWD:', process.cwd());

const requiredDirs = ['logs', 'uploads', 'dist'];
const rootDir = process.cwd(); // Assuming run from backend dir

console.log('\nChecking Directories:');
requiredDirs.forEach(d => {
    const fullPath = path.join(rootDir, d);
    if (fs.existsSync(fullPath)) {
        console.log(`[OK] ${d} exists`);
    } else {
        console.log(`[FAIL] ${d} missing! (Creating...)`);
        try {
            fs.mkdirSync(fullPath, { recursive: true });
            console.log(`[FIXED] Created ${d}`);
        } catch (e) {
            console.error(`[ERROR] Could not create ${d}:`, e.message);
        }
    }
});

console.log('\nAttempting basic server start...');
try {
    const server = http.createServer((req, res) => {
        res.writeHead(200);
        res.end('Diagnostic OK');
    });
    server.listen(6555, '0.0.0.0', () => {
        console.log('[SUCCESS] Server successfully bound to port 6555');
        server.close();
        process.exit(0);
    });
    server.on('error', (e) => {
        console.error('[ERROR] Server/Port error:', e.message);
        process.exit(1);
    });
} catch (e) {
    console.error('[FATAL] Server crash:', e);
    process.exit(1);
}
