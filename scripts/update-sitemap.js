const fs = require('fs');
const path = require('path');

const sitemapPath = path.join(__dirname, '../frontend/public/sitemap.xml');

try {
    if (fs.existsSync(sitemapPath)) {
        let content = fs.readFileSync(sitemapPath, 'utf8');
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

        // Replace all <lastmod> dates
        const updatedContent = content.replace(/<lastmod>.*?<\/lastmod>/g, `<lastmod>${today}</lastmod>`);

        if (content !== updatedContent) {
            fs.writeFileSync(sitemapPath, updatedContent, 'utf8');
            console.log(`[Success] Updated sitemap.xml dates to ${today}`);
        } else {
            console.log('[Info] Sitemap dates are already up to date.');
        }
    } else {
        console.error('[Error] sitemap.xml not found at:', sitemapPath);
        process.exit(1);
    }
} catch (e) {
    console.error('[Error] Failed to update sitemap:', e);
    process.exit(1);
}
