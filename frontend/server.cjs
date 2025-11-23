const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = parseInt(process.env.PORT) || 6558;
const distPath = path.join(__dirname, 'dist');

app.use(express.static(distPath, { maxAge: '1d' }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Use '/*' to avoid path-to-regexp '*' parsing issues
app.get('/*', (req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('index.html not found');
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Frontend] Running on http://0.0.0.0:${PORT}`);
});
