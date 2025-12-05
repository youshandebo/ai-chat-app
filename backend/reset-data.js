const fs = require('fs');
const path = require('path');

// Reset articles.json
const articlesPath = path.join(__dirname, 'data', 'articles.json');
fs.writeFileSync(articlesPath, JSON.stringify({ articles: [] }, null, 2), 'utf-8');
console.log('✅ articles.json reset to empty state');

// Reset metrics.json
const metricsPath = path.join(__dirname, 'data', 'metrics.json');
fs.writeFileSync(metricsPath, JSON.stringify({}, null, 2), 'utf-8');
console.log('✅ metrics.json reset to empty state');

console.log('\n✅ Data files reset successfully!');
