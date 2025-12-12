const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const distPath = path.join(__dirname, 'dist');

// Check if dist directory exists
if (!fs.existsSync(distPath)) {
    console.error('Error: dist directory not found. Please build the frontend first.');
    // In development we might not have dist, but this is server.cjs for production usually
    // We won't exit here to avoid crashing if run locally without build, but it will fail to serve
}

app.use(express.static(distPath));

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// SPA Fallback
app.use((req, res) => {
    const indexPath = path.join(distPath, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath, err => {
            if (err) {
                res.status(500).send('Server error');
            }
        });
    } else {
        res.status(404).send('index.html not found. Please build the frontend.');
    }
});

const PORT = process.env.PORT || 6558;
const HOST = '0.0.0.0';

app.listen(PORT, HOST, () => {
    console.log(`[Frontend] Running on http://${HOST}:${PORT}`);
});

process.on('SIGTERM', () => {
    console.log('[Frontend] Shutting down...');
    process.exit(0);
});
