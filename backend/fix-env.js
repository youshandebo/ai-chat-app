const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '.env');
console.log('Fixing .env at:', envPath);

try {
    let content = fs.readFileSync(envPath, 'utf8');
    console.log('Original content length:', content.length);

    // Normalize line endings
    const lines = content.replace(/\r\n/g, '\n').split('\n');
    const cleanLines = lines.map(l => l.trim()).filter(l => l.length > 0);

    // Ensure strict KEY=VALUE format and uniqueness
    const envMap = {};
    cleanLines.forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            envMap[match[1]] = match[2];
        }
    });

    // Reconstruct
    const newContent = Object.entries(envMap)
        .map(([k, v]) => `${k}=${v}`)
        .join('\n');

    fs.writeFileSync(envPath, newContent + '\n');
    console.log('Fixed content written. Keys found:', Object.keys(envMap));
} catch (e) {
    console.error('Error fixing .env:', e);
}
